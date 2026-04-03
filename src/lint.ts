/**
 * Commit-message validation primitives built on top of the Conventional Commits format.
 *
 * @module
 */

import { CASED_LETTER_PATTERN } from "./constants.ts";
import { resolveLintConfig } from "./_internal/lint_config.ts";
import type { CommitSections, ParsedCommitFooter } from "./message.ts";
import { parseFooterLinesWithOffsets, splitCommitMessage } from "./message.ts";
import { parseHeader, splitScopeSegments } from "./parse.ts";
import type {
  CommitAnalysis,
  FooterSchemaEntry,
  LintBatchReport,
  LintIgnorePredicate,
  LintIssue,
  LintIssueLocation,
  LintOptions,
  LintReport,
  LintSuggestion,
} from "./types.ts";

const DEFAULT_IGNORE_PREDICATES: ReadonlyArray<LintIgnorePredicate> = [
  (commit) => /^fixup!\s/u.test(commit.header),
  (commit) => /^squash!\s/u.test(commit.header),
  (commit) => /^Merge\b/u.test(commit.header),
  (commit) => /^Revert\b/u.test(commit.header),
];

const SUBJECT_EMPTY_HEADER_PATTERN =
  /^(?<type>[A-Za-z][A-Za-z-]*)(?:\((?<scope>[^()]+)\))?(?<breaking>!)?:[ \t]*$/u;
const TYPE_EMPTY_HEADER_PATTERN =
  /^(?:\((?<scope>[^()]+)\))?(?<breaking>!)?:[ \t]*\S.*$/u;

function hasDisallowedSubjectCase(subject: string): boolean {
  const trimmed = subject.trimStart();
  if (!CASED_LETTER_PATTERN.test(trimmed)) return false;

  const first = trimmed[0];
  return first !== undefined &&
    first === first.toUpperCase() &&
    first !== first.toLowerCase();
}

function addIssue(
  issues: LintIssue[],
  rule: string,
  severity: LintIssue["severity"],
  message: string,
  location?: LintIssueLocation,
  suggestions?: ReadonlyArray<LintSuggestion>,
): void {
  issues.push({ rule, severity, message, location, suggestions });
}

function levenshteinDistance(left: string, right: string): number {
  const previous = Array.from(
    { length: right.length + 1 },
    (_, index) => index,
  );

  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    let diagonal = previous[0] ?? 0;
    previous[0] = leftIndex;

    for (
      let rightIndex = 1;
      rightIndex <= right.length;
      rightIndex += 1
    ) {
      const upper = previous[rightIndex] ?? 0;
      const leftCost = previous[rightIndex - 1] ?? 0;
      const cost = left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1;

      previous[rightIndex] = Math.min(
        leftCost + 1,
        upper + 1,
        diagonal + cost,
      );
      diagonal = upper;
    }
  }

  return previous[right.length] ?? 0;
}

function getClosestAllowedValue(
  value: string,
  allowedValues: ReadonlyArray<string>,
): string | undefined {
  const normalizedValue = value.toLowerCase();
  let suggestion: string | undefined;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const candidate of allowedValues) {
    const distance = levenshteinDistance(
      normalizedValue,
      candidate.toLowerCase(),
    );

    if (distance < bestDistance) {
      suggestion = candidate;
      bestDistance = distance;
    }
  }

  if (suggestion === undefined) return undefined;

  const maxDistance = Math.max(
    1,
    Math.floor(Math.max(normalizedValue.length, suggestion.length) / 2),
  );

  return bestDistance <= maxDistance ? suggestion : undefined;
}

function takeFirstLine(input: string): string {
  const lineBreakIndex = input.search(/\r\n|\r|\n/u);
  return lineBreakIndex === -1 ? input : input.slice(0, lineBreakIndex);
}

function headerLocation(header: string): LintIssueLocation {
  return {
    section: "header",
    line: 1,
    column: 1,
    length: Math.max(header.length, 1),
  };
}

function headerEdit(
  location: LintIssueLocation,
  replacement: string,
): LintSuggestion {
  return {
    message: `Replace with “${replacement}”.`,
    edit: {
      line: location.line,
      column: location.column,
      length: location.length ?? 0,
      replacement,
    },
  };
}

function subjectColumn(
  header: string,
  parsed: { readonly subject: string },
): number {
  const index = header.lastIndexOf(parsed.subject);
  return index === -1 ? 1 : index + 1;
}

function scopeLocations(
  parsed: {
    readonly type: string;
    readonly scope: string | undefined;
  },
  options: LintOptions,
): ReadonlyArray<
  { readonly value: string; readonly location: LintIssueLocation }
> {
  if (parsed.scope === undefined) return [];

  const segments = splitScopeSegments(parsed.scope, options) ?? [];

  return segments.map((segment) => ({
    value: segment.value,
    location: {
      section: "header",
      line: 1,
      column: parsed.type.length + 2 + segment.start,
      length: Math.max(segment.length, 1),
    },
  }));
}

function footerTokenLocation(
  lineNumber: number,
  token: string,
): LintIssueLocation {
  return {
    section: "footer",
    line: lineNumber,
    column: 1,
    length: Math.max(token.length, 1),
  };
}

function appendSuggestionMessage(
  message: string,
  suggestion: string | undefined,
): string {
  return suggestion === undefined
    ? message
    : `${message} Did you mean “${suggestion}”?`;
}

function detectHeaderShapeIssue(
  header: string,
): {
  readonly rule: "type-empty" | "subject-empty";
  readonly message: string;
  readonly location: LintIssueLocation;
  readonly suggestions?: ReadonlyArray<LintSuggestion>;
} | undefined {
  if (header.length === 0) return undefined;

  if (SUBJECT_EMPTY_HEADER_PATTERN.test(header)) {
    return {
      rule: "subject-empty",
      message: "Subject is required.",
      location: {
        section: "header",
        line: 1,
        column: header.length + 1,
        length: 1,
      },
      suggestions: [{
        message: "Add a short description after the colon.",
      }],
    };
  }

  if (TYPE_EMPTY_HEADER_PATTERN.test(header)) {
    return {
      rule: "type-empty",
      message: "Type is required.",
      location: {
        section: "header",
        line: 1,
        column: 1,
        length: 1,
      },
      suggestions: [{
        message: "Add a type such as “feat” or “fix” before the colon.",
      }],
    };
  }

  return undefined;
}

function applyFooterSchema(
  issues: LintIssue[],
  footerEntries: ReadonlyArray<ParsedCommitFooter>,
  footerStart: number | undefined,
  schema: ReadonlyArray<FooterSchemaEntry>,
): void {
  for (const entry of schema) {
    const severity = entry.level ?? "error";
    if (severity === "off") continue;

    const matchingFooters = footerEntries.filter((footer) =>
      footer.token === entry.token
    );

    if (entry.required === true && matchingFooters.length === 0) {
      addIssue(
        issues,
        "footer-schema",
        severity,
        `Footer token “${entry.token}” is required.`,
        undefined,
        [{
          message: `Add a “${entry.token}: ” footer.`,
        }],
      );
    }

    if (entry.multiple === false && matchingFooters.length > 1) {
      const duplicate = matchingFooters[1];
      const lineNumber = footerStart === undefined || duplicate === undefined
        ? 1
        : footerStart + duplicate.lineOffset + 1;

      addIssue(
        issues,
        "footer-schema",
        severity,
        `Footer token “${entry.token}” must appear at most once.`,
        footerTokenLocation(lineNumber, entry.token),
      );
    }

    for (const footer of matchingFooters) {
      const lineNumber = footerStart === undefined
        ? footer.lineOffset + 1
        : footerStart + footer.lineOffset + 1;
      const valueLocation = {
        section: "footer" as const,
        line: lineNumber,
        column: footer.token.length + footer.separator.length + 1,
        length: Math.max(footer.value.length, 1),
      };

      if (entry.requireValue === true && footer.value.trim().length === 0) {
        addIssue(
          issues,
          "footer-schema",
          severity,
          `Footer token “${entry.token}” requires a non-empty value.`,
          valueLocation,
        );
      }

      if (
        entry.valuePattern !== undefined &&
        !entry.valuePattern.test(footer.value)
      ) {
        addIssue(
          issues,
          "footer-schema",
          severity,
          `Footer token “${entry.token}” value must match ${
            entry.valueDescription ?? entry.valuePattern
          }.`,
          valueLocation,
        );
      }
    }
  }
}

function buildCommitAnalysis(
  sections: CommitSections,
  summary: CommitAnalysis["summary"],
  footerEntries: ReadonlyArray<ParsedCommitFooter>,
): CommitAnalysis {
  return {
    input: sections.cleaned,
    header: sections.header,
    summary,
    body: sections.body.length === 0 ? undefined : sections.body.join("\n"),
    footer: sections.footer.length === 0
      ? undefined
      : sections.footer.join("\n"),
    footers: footerEntries.map((footer) => ({
      token: footer.token,
      separator: footer.separator,
      value: footer.value,
      breaking: footer.breaking,
    })),
  };
}

/**
 * Validate only the first header line of a Conventional Commit.
 *
 * This is useful for pull request titles, squash-merge titles, editor inputs,
 * or any workflow that validates a commit summary without a body or footer.
 * Additional lines in the provided input are ignored.
 *
 * @param input The header line to lint.
 * @param options Optional lint settings merged on top of the selected preset.
 * @returns A lint report for the first line of the provided input.
 *
 * @example
 * ```ts
 * import { lintHeader } from "@miscellaneous/commitlint";
 *
 * const report = lintHeader("feat(ui): add search");
 *
 * console.log(report.valid); // true
 * console.log(report.analysis?.body); // undefined
 * ```
 */
export function lintHeader(
  input: string,
  options: LintOptions = {},
): LintReport {
  return lintCommit(takeFirstLine(input), options);
}

/**
 * Validate multiple commit messages and return an aggregate summary.
 *
 * The batch linter keeps the library runtime-agnostic by operating on caller-
 * provided strings instead of reading from Git. This makes it a good fit for
 * CI wrappers, release tooling, and pull-request validation pipelines.
 *
 * @param inputs The commit messages to lint, in input order.
 * @param options Optional lint settings shared across every message.
 * @returns Aggregate counts plus the per-message reports.
 *
 * @example
 * ```ts
 * import { lintCommits } from "@miscellaneous/commitlint";
 *
 * const batch = lintCommits([
 *   "feat(api): add search",
 *   "wip: ship it",
 * ], {
 *   preset: "commitlint",
 * });
 *
 * console.log(batch.valid); // false
 * console.log(batch.invalidCount); // 1
 * ```
 */
export function lintCommits(
  inputs: ReadonlyArray<string>,
  options: LintOptions = {},
): LintBatchReport {
  const reports = inputs.map((input) => lintCommit(input, options));
  let validCount = 0;
  let ignoredCount = 0;
  let errorCount = 0;
  let warningCount = 0;

  for (const report of reports) {
    if (report.valid) validCount += 1;
    if (report.ignored) ignoredCount += 1;
    errorCount += report.errors.length;
    warningCount += report.warnings.length;
  }

  return {
    valid: reports.every((report) => report.valid),
    totalCount: reports.length,
    validCount,
    invalidCount: reports.length - validCount,
    ignoredCount,
    errorCount,
    warningCount,
    reports,
    helpUrl: options.helpUrl,
  };
}

/**
 * Validate a commit message and return a structured lint report.
 *
 * @param input The raw commit message to lint.
 * @param options Optional lint settings. Use `preset: "conventional-commits"` for the default specification-focused rules, or `preset: "commitlint"` to mirror `@commitlint/config-conventional`.
 * @returns A report containing the normalized input, errors, and warnings.
 *
 * @example
 * ```ts
 * import { lintCommit } from "@miscellaneous/commitlint";
 *
 * const report = lintCommit("feat: add search");
 * const strictReport = lintCommit("feat: add search", {
 *   preset: "commitlint",
 * });
 *
 * console.log(report.valid); // true
 * console.log(strictReport.errors.length); // 0
 * ```
 */
export function lintCommit(
  input: string,
  options: LintOptions = {},
): LintReport {
  const issues: LintIssue[] = [];
  const rules = resolveLintConfig(options);
  const { body, bodyStart, cleaned, footer, footerStart, header, lines } =
    splitCommitMessage(input);
  const trimmedHeader = header.trim();
  const parsed = parseHeader(trimmedHeader, options);
  const footerEntries = parseFooterLinesWithOffsets(footer);
  const analysis = buildCommitAnalysis(
    {
      cleaned,
      lines,
      header,
      body,
      bodyStart,
      footer,
      footerStart,
    },
    parsed,
    footerEntries,
  );
  const ignorePredicates = [
    ...(options.defaultIgnores === true ? DEFAULT_IGNORE_PREDICATES : []),
    ...(options.ignores ?? []),
  ];

  if (ignorePredicates.some((predicate) => predicate(analysis))) {
    return {
      input: cleaned,
      ignored: true,
      valid: true,
      errors: [],
      warnings: [],
      analysis,
      helpUrl: options.helpUrl,
    };
  }

  if (header !== trimmedHeader) {
    const location = headerLocation(header);
    addIssue(
      issues,
      "header-trim",
      "error",
      "Header must not have leading or trailing whitespace.",
      location,
      [headerEdit(location, trimmedHeader)],
    );
  }

  if (
    rules.headerMaxLength !== undefined &&
    trimmedHeader.length > rules.headerMaxLength.max
  ) {
    const leadingWhitespaceLength = header.length - header.trimStart().length;
    addIssue(
      issues,
      "header-max-length",
      rules.headerMaxLength.severity,
      `Header must not exceed ${rules.headerMaxLength.max} characters (got ${trimmedHeader.length}).`,
      {
        section: "header",
        line: 1,
        column: leadingWhitespaceLength + rules.headerMaxLength.max + 1,
        length: trimmedHeader.length - rules.headerMaxLength.max,
      },
    );
  }

  if (parsed === undefined) {
    const headerIssue = detectHeaderShapeIssue(trimmedHeader);

    if (headerIssue?.rule === "type-empty" && rules.typeEmpty !== undefined) {
      addIssue(
        issues,
        headerIssue.rule,
        rules.typeEmpty.severity,
        headerIssue.message,
        headerIssue.location,
        headerIssue.suggestions,
      );
    } else if (
      headerIssue?.rule === "subject-empty" && rules.subjectEmpty !== undefined
    ) {
      addIssue(
        issues,
        headerIssue.rule,
        rules.subjectEmpty.severity,
        headerIssue.message,
        headerIssue.location,
        headerIssue.suggestions,
      );
    } else {
      addIssue(
        issues,
        "header-pattern",
        "error",
        `Header does not match Conventional Commits format: “<type>[optional scope]: <description>”. Got: “${header}”`,
        headerLocation(header),
      );
    }
  } else {
    if (
      rules.typeEnum !== undefined &&
      !rules.typeEnum.allowed.some((allowedType) => allowedType === parsed.type)
    ) {
      const suggestion = rules.typeEnum.suggest
        ? getClosestAllowedValue(parsed.type, rules.typeEnum.allowed)
        : undefined;
      const location = {
        section: "header" as const,
        line: 1,
        column: 1,
        length: Math.max(parsed.type.length, 1),
      };

      addIssue(
        issues,
        "type-enum",
        rules.typeEnum.severity,
        appendSuggestionMessage(
          `Type “${parsed.type}” is not allowed. Allowed types: ${
            rules.typeEnum.allowed.join(", ")
          }.`,
          suggestion,
        ),
        location,
        suggestion === undefined
          ? undefined
          : [headerEdit(location, suggestion)],
      );
    }

    if (
      rules.typeCase !== undefined &&
      parsed.type !== parsed.type.toLowerCase()
    ) {
      const location = {
        section: "header" as const,
        line: 1,
        column: 1,
        length: Math.max(parsed.type.length, 1),
      };

      addIssue(
        issues,
        "type-case",
        rules.typeCase.severity,
        `Type “${parsed.type}” must be lower-case.`,
        location,
        [headerEdit(location, parsed.type.toLowerCase())],
      );
    }

    if (rules.scopeEmpty !== undefined && parsed.scope === undefined) {
      addIssue(
        issues,
        "scope-empty",
        rules.scopeEmpty.severity,
        "Scope is required.",
        {
          section: "header",
          line: 1,
          column: parsed.type.length + 1,
          length: 1,
        },
      );
    }

    for (const scoped of scopeLocations(parsed, options)) {
      if (
        rules.scopeEnum !== undefined &&
        !rules.scopeEnum.allowed.some((allowedScope) =>
          allowedScope === scoped.value
        )
      ) {
        const suggestion = rules.scopeEnum.suggest
          ? getClosestAllowedValue(scoped.value, rules.scopeEnum.allowed)
          : undefined;

        addIssue(
          issues,
          "scope-enum",
          rules.scopeEnum.severity,
          appendSuggestionMessage(
            `Scope “${scoped.value}” is not allowed. Allowed scopes: ${
              rules.scopeEnum.allowed.join(", ")
            }.`,
            suggestion,
          ),
          scoped.location,
          suggestion === undefined
            ? undefined
            : [headerEdit(scoped.location, suggestion)],
        );
      }

      if (
        rules.scopeCase !== undefined &&
        scoped.value !== scoped.value.toLowerCase()
      ) {
        addIssue(
          issues,
          "scope-case",
          rules.scopeCase.severity,
          `Scope “${scoped.value}” must be lower-case.`,
          scoped.location,
          [headerEdit(scoped.location, scoped.value.toLowerCase())],
        );
      }
    }

    if (
      rules.subjectFullStop !== undefined &&
      parsed.subject.trimEnd().endsWith(".")
    ) {
      const location = {
        section: "header" as const,
        line: 1,
        column: trimmedHeader.length,
        length: 1,
      };

      addIssue(
        issues,
        "subject-full-stop",
        rules.subjectFullStop.severity,
        "Subject must not end with a full stop (“.”).",
        location,
        [{
          message: "Remove the trailing full stop.",
          edit: {
            line: location.line,
            column: location.column,
            length: 1,
            replacement: "",
          },
        }],
      );
    }

    if (
      rules.subjectCase !== undefined &&
      hasDisallowedSubjectCase(parsed.subject)
    ) {
      addIssue(
        issues,
        "subject-case",
        rules.subjectCase.severity,
        "Subject must not be sentence-case, start-case, pascal-case, or upper-case.",
        {
          section: "header",
          line: 1,
          column: subjectColumn(trimmedHeader, parsed),
          length: Math.max(parsed.subject.length, 1),
        },
        [{
          message: "Start the subject in lower case.",
        }],
      );
    }
  }

  if (rules.bodyMaxLineLength !== undefined) {
    for (const [index, line] of body.entries()) {
      if (line.length > rules.bodyMaxLineLength.max) {
        addIssue(
          issues,
          "body-max-line-length",
          rules.bodyMaxLineLength.severity,
          `Body line ${
            index + bodyStart + 1
          } must not exceed ${rules.bodyMaxLineLength.max} characters (got ${line.length}).`,
          {
            section: "body",
            line: index + bodyStart + 1,
            column: rules.bodyMaxLineLength.max + 1,
            length: line.length - rules.bodyMaxLineLength.max,
          },
        );
      }
    }
  }

  if (
    rules.bodyLeadingBlank !== undefined &&
    body.length > 0 &&
    lines[1] !== ""
  ) {
    addIssue(
      issues,
      "body-leading-blank",
      rules.bodyLeadingBlank.severity,
      "Body must be separated from the header by a blank line.",
      {
        section: "body",
        line: bodyStart + 1,
        column: 1,
        length: Math.max((lines[bodyStart] ?? "").length, 1),
      },
    );
  }

  if (
    rules.footerLeadingBlank !== undefined &&
    footerStart !== undefined &&
    lines[footerStart - 1] !== ""
  ) {
    addIssue(
      issues,
      "footer-leading-blank",
      rules.footerLeadingBlank.severity,
      "Footer must be separated from the preceding section by a blank line.",
      {
        section: "footer",
        line: footerStart + 1,
        column: 1,
        length: Math.max((lines[footerStart] ?? "").length, 1),
      },
    );
  }

  if (rules.footerMaxLineLength !== undefined && footerStart !== undefined) {
    for (const [index, line] of footer.entries()) {
      if (line.length > rules.footerMaxLineLength.max) {
        addIssue(
          issues,
          "footer-max-line-length",
          rules.footerMaxLineLength.severity,
          `Footer line ${
            index + footerStart + 1
          } must not exceed ${rules.footerMaxLineLength.max} characters (got ${line.length}).`,
          {
            section: "footer",
            line: index + footerStart + 1,
            column: rules.footerMaxLineLength.max + 1,
            length: line.length - rules.footerMaxLineLength.max,
          },
        );
      }
    }
  }

  if (rules.footerTokenEnum !== undefined && footerStart !== undefined) {
    for (const entry of footerEntries) {
      if (rules.footerTokenEnum.allowed.includes(entry.token)) {
        continue;
      }

      const suggestion = rules.footerTokenEnum.suggest
        ? getClosestAllowedValue(entry.token, rules.footerTokenEnum.allowed)
        : undefined;
      const lineNumber = footerStart + entry.lineOffset + 1;
      const location = footerTokenLocation(lineNumber, entry.token);
      addIssue(
        issues,
        "footer-token-enum",
        rules.footerTokenEnum.severity,
        appendSuggestionMessage(
          `Footer token “${entry.token}” is not allowed. Allowed tokens: ${
            rules.footerTokenEnum.allowed.join(", ")
          }.`,
          suggestion,
        ),
        location,
        suggestion === undefined
          ? undefined
          : [headerEdit(location, suggestion)],
      );
    }
  }

  if (
    rules.footerTokenRequired !== undefined &&
    rules.footerTokenRequired.tokens.length > 0 &&
    !rules.footerTokenRequired.tokens.some((token) =>
      footerEntries.some((entry) => entry.token === token)
    )
  ) {
    addIssue(
      issues,
      "footer-token-required",
      rules.footerTokenRequired.severity,
      `Commit must include at least one footer token from: ${
        rules.footerTokenRequired.tokens.join(", ")
      }.`,
      undefined,
      [{
        message: `Add one of these footer tokens: ${
          rules.footerTokenRequired.tokens.join(", ")
        }.`,
      }],
    );
  }

  if (options.footerSchema !== undefined) {
    applyFooterSchema(issues, footerEntries, footerStart, options.footerSchema);
  }

  if (rules.breakingChangeDescriptionRequired !== undefined) {
    const breakingFooter = footerEntries.find((entry) => entry.breaking);
    const hasBreakingDescription = footerEntries.some((entry) =>
      entry.breaking && entry.value.trim().length > 0
    );
    const isBreaking = parsed?.breaking === true ||
      breakingFooter !== undefined;

    if (isBreaking && !hasBreakingDescription) {
      const location = breakingFooter !== undefined && footerStart !== undefined
        ? {
          section: "footer" as const,
          line: footerStart + breakingFooter.lineOffset + 1,
          column: breakingFooter.token.length +
            breakingFooter.separator.length + 1,
          length: 1,
        }
        : headerLocation(header);

      addIssue(
        issues,
        "breaking-change-description-required",
        rules.breakingChangeDescriptionRequired.severity,
        "Breaking changes must include a non-empty BREAKING CHANGE footer.",
        location,
      );
    }
  }

  for (const plugin of options.plugins ?? []) {
    const result = plugin(analysis);
    if (result === undefined) continue;

    const pluginIssues = Array.isArray(result) ? [...result] : [result];
    issues.push(...pluginIssues);
  }

  const errors: LintIssue[] = [];
  const warnings: LintIssue[] = [];

  for (const issue of issues) {
    if (issue.severity === "error") {
      errors.push(issue);
    } else {
      warnings.push(issue);
    }
  }

  return {
    input: cleaned,
    ignored: false,
    valid: errors.length === 0,
    errors,
    warnings,
    analysis,
    helpUrl: options.helpUrl,
  };
}

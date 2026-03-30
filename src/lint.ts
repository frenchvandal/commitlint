/**
 * Commit-message validation primitives built on top of the Conventional Commits format.
 *
 * @module
 */

import { CASED_LETTER_PATTERN } from "./constants.ts";
import type { CommitSections, ParsedCommitFooter } from "./message.ts";
import { parseFooterLinesWithOffsets, splitCommitMessage } from "./message.ts";
import { parseHeader } from "./parse.ts";
import {
  DEFAULT_LINT_PRESET,
  LINT_PRESET_CONFIGS,
  type LintPresetConfig,
} from "./presets.ts";
import type {
  CommitAnalysis,
  LintIgnorePredicate,
  LintIssue,
  LintIssueLocation,
  LintOptions,
  LintPreset,
  LintReport,
  Severity,
} from "./types.ts";

const DEFAULT_IGNORE_PREDICATES: ReadonlyArray<LintIgnorePredicate> = [
  (commit) => /^fixup!\s/u.test(commit.header),
  (commit) => /^squash!\s/u.test(commit.header),
  (commit) => /^Merge\b/u.test(commit.header),
  (commit) => /^Revert\b/u.test(commit.header),
];

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
): void {
  issues.push({ rule, severity, message, location });
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

function getLintPresetConfig(preset: LintPreset) {
  return LINT_PRESET_CONFIGS[preset];
}

function mergeSeverityRule(
  base: { readonly severity: Severity } | undefined,
  override: { readonly level?: Severity | "off" } | undefined,
  fallback: { readonly severity: Severity } | undefined,
) {
  if (override === undefined) return base;
  if (override.level === "off") return undefined;

  const template = base ?? fallback;
  if (template === undefined) {
    return override.level === undefined
      ? undefined
      : { severity: override.level };
  }

  return {
    severity: override.level ?? template.severity,
  };
}

function mergeMaxLengthRule(
  base: { readonly severity: Severity; readonly max: number } | undefined,
  override:
    | { readonly level?: Severity | "off"; readonly max?: number }
    | undefined,
  fallback: { readonly severity: Severity; readonly max: number } | undefined,
) {
  if (override === undefined) return base;
  if (override.level === "off") return undefined;

  const template = base ?? fallback;
  if (template === undefined) {
    if (override.max === undefined) return undefined;

    return {
      severity: override.level ?? "error",
      max: override.max,
    };
  }

  return {
    severity: override.level ?? template.severity,
    max: override.max ?? template.max,
  };
}

function mergeEnumRule(
  base:
    | {
      readonly severity: Severity;
      readonly allowed: ReadonlyArray<string>;
      readonly suggest: boolean;
    }
    | undefined,
  override:
    | {
      readonly level?: Severity | "off";
      readonly allowed?: ReadonlyArray<string>;
      readonly suggest?: boolean;
    }
    | undefined,
  fallback:
    | {
      readonly severity: Severity;
      readonly allowed: ReadonlyArray<string>;
      readonly suggest: boolean;
    }
    | undefined,
) {
  if (override === undefined) return base;
  if (override.level === "off") return undefined;

  const template = base ?? fallback;
  if (template === undefined) {
    if (override.allowed === undefined) return undefined;

    return {
      severity: override.level ?? "error",
      allowed: override.allowed,
      suggest: override.suggest ?? true,
    };
  }

  return {
    severity: override.level ?? template.severity,
    allowed: override.allowed ?? template.allowed,
    suggest: override.suggest ?? template.suggest,
  };
}

function mergeRequiredTokensRule(
  base:
    | { readonly severity: Severity; readonly tokens: ReadonlyArray<string> }
    | undefined,
  override:
    | {
      readonly level?: Severity | "off";
      readonly tokens?: ReadonlyArray<string>;
    }
    | undefined,
  fallback:
    | { readonly severity: Severity; readonly tokens: ReadonlyArray<string> }
    | undefined,
) {
  if (override === undefined) return base;
  if (override.level === "off") return undefined;

  const template = base ?? fallback;
  if (template === undefined) {
    if (override.tokens === undefined) return undefined;

    return {
      severity: override.level ?? "error",
      tokens: override.tokens,
    };
  }

  return {
    severity: override.level ?? template.severity,
    tokens: override.tokens ?? template.tokens,
  };
}

function resolveLintConfig(options: LintOptions): LintPresetConfig {
  const preset = options.preset ?? DEFAULT_LINT_PRESET;
  const base = getLintPresetConfig(preset);
  const fallback = LINT_PRESET_CONFIGS["commitlint"];
  const rules = options.rules;

  if (rules === undefined) return base;

  return {
    typeEnum: mergeEnumRule(
      base.typeEnum,
      rules["type-enum"] === undefined ? undefined : {
        level: rules["type-enum"].level,
        allowed: rules["type-enum"].allowedTypes,
        suggest: rules["type-enum"].suggest,
      },
      fallback.typeEnum,
    ),
    typeCase: mergeSeverityRule(
      base.typeCase,
      rules["type-case"],
      fallback.typeCase,
    ),
    scopeEnum: mergeEnumRule(
      base.scopeEnum,
      rules["scope-enum"] === undefined ? undefined : {
        level: rules["scope-enum"].level,
        allowed: rules["scope-enum"].allowedScopes,
        suggest: rules["scope-enum"].suggest,
      },
      fallback.scopeEnum,
    ),
    scopeCase: mergeSeverityRule(
      base.scopeCase,
      rules["scope-case"],
      fallback.scopeCase,
    ),
    scopeEmpty: mergeSeverityRule(
      base.scopeEmpty,
      rules["scope-empty"],
      fallback.scopeEmpty,
    ),
    subjectCase: mergeSeverityRule(
      base.subjectCase,
      rules["subject-case"],
      fallback.subjectCase,
    ),
    subjectFullStop: mergeSeverityRule(
      base.subjectFullStop,
      rules["subject-full-stop"],
      fallback.subjectFullStop,
    ),
    headerMaxLength: mergeMaxLengthRule(
      base.headerMaxLength,
      rules["header-max-length"],
      fallback.headerMaxLength,
    ),
    bodyMaxLineLength: mergeMaxLengthRule(
      base.bodyMaxLineLength,
      rules["body-max-line-length"],
      fallback.bodyMaxLineLength,
    ),
    footerMaxLineLength: mergeMaxLengthRule(
      base.footerMaxLineLength,
      rules["footer-max-line-length"],
      fallback.footerMaxLineLength,
    ),
    bodyLeadingBlank: mergeSeverityRule(
      base.bodyLeadingBlank,
      rules["body-leading-blank"],
      fallback.bodyLeadingBlank,
    ),
    footerLeadingBlank: mergeSeverityRule(
      base.footerLeadingBlank,
      rules["footer-leading-blank"],
      fallback.footerLeadingBlank,
    ),
    footerTokenEnum: mergeEnumRule(
      base.footerTokenEnum,
      rules["footer-token-enum"] === undefined ? undefined : {
        level: rules["footer-token-enum"].level,
        allowed: rules["footer-token-enum"].allowedTokens,
        suggest: rules["footer-token-enum"].suggest,
      },
      fallback.footerTokenEnum,
    ),
    footerTokenRequired: mergeRequiredTokensRule(
      base.footerTokenRequired,
      rules["footer-token-required"],
      fallback.footerTokenRequired,
    ),
    breakingChangeDescriptionRequired: mergeSeverityRule(
      base.breakingChangeDescriptionRequired,
      rules["breaking-change-description-required"],
      fallback.breakingChangeDescriptionRequired,
    ),
  };
}

function headerLocation(header: string): LintIssueLocation {
  return {
    section: "header",
    line: 1,
    column: 1,
    length: Math.max(header.length, 1),
  };
}

function subjectColumn(
  header: string,
  parsed: { readonly subject: string },
): number {
  const index = header.lastIndexOf(parsed.subject);
  return index === -1 ? 1 : index + 1;
}

function scopeColumn(parsed: {
  readonly type: string;
  readonly scope: string | undefined;
}): number {
  if (parsed.scope === undefined) return 1;
  return parsed.type.length + 2;
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
  const parsed = parseHeader(header);
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
    };
  }

  if (
    rules.headerMaxLength !== undefined &&
    header.length > rules.headerMaxLength.max
  ) {
    addIssue(
      issues,
      "header-max-length",
      rules.headerMaxLength.severity,
      `Header must not exceed ${rules.headerMaxLength.max} characters (got ${header.length}).`,
      {
        section: "header",
        line: 1,
        column: rules.headerMaxLength.max + 1,
        length: header.length - rules.headerMaxLength.max,
      },
    );
  }

  if (header !== header.trim()) {
    addIssue(
      issues,
      "header-trim",
      "error",
      "Header must not have leading or trailing whitespace.",
      headerLocation(header),
    );
  }

  if (parsed === undefined) {
    addIssue(
      issues,
      "header-pattern",
      "error",
      `Header does not match Conventional Commits format: "<type>[optional scope]: <description>". Got: "${header}"`,
      headerLocation(header),
    );
  } else {
    if (
      rules.typeEnum !== undefined &&
      !rules.typeEnum.allowed.some((allowedType) => allowedType === parsed.type)
    ) {
      const suggestion = rules.typeEnum.suggest
        ? getClosestAllowedValue(parsed.type, rules.typeEnum.allowed)
        : undefined;
      const suggestionMessage = suggestion === undefined
        ? ""
        : ` Did you mean "${suggestion}"?`;

      addIssue(
        issues,
        "type-enum",
        rules.typeEnum.severity,
        `Type "${parsed.type}" is not allowed. Allowed types: ${
          rules.typeEnum.allowed.join(", ")
        }.${suggestionMessage}`,
        {
          section: "header",
          line: 1,
          column: 1,
          length: Math.max(parsed.type.length, 1),
        },
      );
    }

    if (
      rules.typeCase !== undefined &&
      parsed.type !== parsed.type.toLowerCase()
    ) {
      addIssue(
        issues,
        "type-case",
        rules.typeCase.severity,
        `Type "${parsed.type}" must be lower-case.`,
        {
          section: "header",
          line: 1,
          column: 1,
          length: Math.max(parsed.type.length, 1),
        },
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

    if (
      rules.scopeEnum !== undefined &&
      parsed.scope !== undefined &&
      !rules.scopeEnum.allowed.some((allowedScope) =>
        allowedScope === parsed.scope
      )
    ) {
      const suggestion = rules.scopeEnum.suggest
        ? getClosestAllowedValue(parsed.scope, rules.scopeEnum.allowed)
        : undefined;
      const suggestionMessage = suggestion === undefined
        ? ""
        : ` Did you mean "${suggestion}"?`;

      addIssue(
        issues,
        "scope-enum",
        rules.scopeEnum.severity,
        `Scope "${parsed.scope}" is not allowed. Allowed scopes: ${
          rules.scopeEnum.allowed.join(", ")
        }.${suggestionMessage}`,
        {
          section: "header",
          line: 1,
          column: scopeColumn(parsed),
          length: Math.max(parsed.scope.length, 1),
        },
      );
    }

    if (
      rules.scopeCase !== undefined &&
      parsed.scope !== undefined &&
      parsed.scope !== parsed.scope.toLowerCase()
    ) {
      addIssue(
        issues,
        "scope-case",
        rules.scopeCase.severity,
        `Scope "${parsed.scope}" must be lower-case.`,
        {
          section: "header",
          line: 1,
          column: scopeColumn(parsed),
          length: Math.max(parsed.scope.length, 1),
        },
      );
    }

    if (
      rules.subjectFullStop !== undefined &&
      parsed.subject.trimEnd().endsWith(".")
    ) {
      addIssue(
        issues,
        "subject-full-stop",
        rules.subjectFullStop.severity,
        'Subject must not end with a full stop (".").',
        {
          section: "header",
          line: 1,
          column: header.trimEnd().length,
          length: 1,
        },
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
          column: subjectColumn(header, parsed),
          length: Math.max(parsed.subject.length, 1),
        },
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
      const suggestionMessage = suggestion === undefined
        ? ""
        : ` Did you mean "${suggestion}"?`;
      const lineNumber = footerStart + entry.lineOffset + 1;
      addIssue(
        issues,
        "footer-token-enum",
        rules.footerTokenEnum.severity,
        `Footer token "${entry.token}" is not allowed. Allowed tokens: ${
          rules.footerTokenEnum.allowed.join(", ")
        }.${suggestionMessage}`,
        footerTokenLocation(lineNumber, entry.token),
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
    );
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
  };
}

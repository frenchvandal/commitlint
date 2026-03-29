/**
 * Commit-message validation primitives built on top of the Conventional Commits format.
 *
 * @module
 */

import {
  CASED_LETTER_PATTERN,
  FOOTER_PATTERN,
  GIT_COMMENT_PATTERN,
} from "./constants.ts";
import { parseHeader } from "./parse.ts";
import { DEFAULT_LINT_PRESET, LINT_PRESET_CONFIGS } from "./presets.ts";
import type {
  LintIssue,
  LintOptions,
  LintPreset,
  LintReport,
} from "./types.ts";

type CommitSections = {
  readonly cleaned: string;
  readonly lines: ReadonlyArray<string>;
  readonly header: string;
  readonly body: ReadonlyArray<string>;
  readonly bodyStart: number;
  readonly footer: ReadonlyArray<string>;
  readonly footerStart: number | undefined;
};

function cleanInput(input: string): string {
  return input
    .split("\n")
    .filter((line) => !GIT_COMMENT_PATTERN.test(line))
    .join("\n")
    .trimEnd();
}

function findFooterStart(lines: ReadonlyArray<string>): number | undefined {
  let footerStart: number | undefined;

  for (let index = lines.length - 1; index >= 1; index -= 1) {
    const line = lines[index] ?? "";

    if (line === "") {
      if (footerStart !== undefined) return footerStart;
      continue;
    }

    if (FOOTER_PATTERN.test(line)) {
      footerStart = index;
      continue;
    }

    if (footerStart !== undefined) return footerStart;
  }

  return footerStart;
}

function splitCommitMessage(input: string): CommitSections {
  const cleaned = cleanInput(input);
  const lines = cleaned.split("\n");
  const header = lines[0] ?? "";
  const footerStart = findFooterStart(lines);
  const bodyStart = lines[1] === "" ? 2 : 1;
  const bodyEnd = footerStart ?? lines.length;

  return {
    cleaned,
    lines,
    header,
    body: lines.slice(bodyStart, bodyEnd),
    bodyStart,
    footer: footerStart === undefined ? [] : lines.slice(footerStart),
    footerStart,
  };
}

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
): void {
  issues.push({ rule, severity, message });
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

function getClosestAllowedType(
  type: string,
  allowedTypes: ReadonlyArray<string>,
): string | undefined {
  const normalizedType = type.toLowerCase();
  let suggestion: string | undefined;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const candidate of allowedTypes) {
    const distance = levenshteinDistance(
      normalizedType,
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
    Math.floor(Math.max(normalizedType.length, suggestion.length) / 2),
  );

  return bestDistance <= maxDistance ? suggestion : undefined;
}

function getLintPresetConfig(preset: LintPreset) {
  return LINT_PRESET_CONFIGS[preset];
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
  const preset = options.preset ?? DEFAULT_LINT_PRESET;
  const rules = getLintPresetConfig(preset);
  const { body, bodyStart, cleaned, footer, footerStart, header, lines } =
    splitCommitMessage(input);

  if (
    rules.headerMaxLength !== undefined &&
    header.length > rules.headerMaxLength.max
  ) {
    addIssue(
      issues,
      "header-max-length",
      rules.headerMaxLength.severity,
      `Header must not exceed ${rules.headerMaxLength.max} characters (got ${header.length}).`,
    );
  }

  if (header !== header.trim()) {
    addIssue(
      issues,
      "header-trim",
      "error",
      "Header must not have leading or trailing whitespace.",
    );
  }

  const parsed = parseHeader(header);

  if (parsed === undefined) {
    addIssue(
      issues,
      "header-pattern",
      "error",
      `Header does not match Conventional Commits format: "<type>[optional scope]: <description>". Got: "${header}"`,
    );
  } else {
    if (
      rules.typeEnum !== undefined &&
      !rules.typeEnum.allowedTypes.some((allowedType) =>
        allowedType === parsed.type
      )
    ) {
      const suggestion = rules.typeEnum.suggest
        ? getClosestAllowedType(parsed.type, rules.typeEnum.allowedTypes)
        : undefined;
      const suggestionMessage = suggestion === undefined
        ? ""
        : ` Did you mean "${suggestion}"?`;

      addIssue(
        issues,
        "type-enum",
        rules.typeEnum.severity,
        `Type "${parsed.type}" is not allowed. Allowed types: ${
          rules.typeEnum.allowedTypes.join(", ")
        }.${suggestionMessage}`,
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
      );
    }

    if (parsed.type.trim().length === 0) {
      addIssue(issues, "type-empty", "error", "Type must not be empty.");
    }

    if (parsed.subject.trim().length === 0) {
      addIssue(issues, "subject-empty", "error", "Subject must not be empty.");
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
        );
      }
    }
  }

  if (body.length > 0 && lines[1] !== "") {
    addIssue(
      issues,
      "body-leading-blank",
      rules.bodyLeadingBlank.severity,
      "Body must be separated from the header by a blank line.",
    );
  }

  if (footerStart !== undefined && lines[footerStart - 1] !== "") {
    addIssue(
      issues,
      "footer-leading-blank",
      rules.footerLeadingBlank.severity,
      "Footer must be separated from the preceding section by a blank line.",
    );
  }

  if (rules.footerMaxLineLength !== undefined) {
    for (const [index, line] of footer.entries()) {
      if (line.length > rules.footerMaxLineLength.max) {
        addIssue(
          issues,
          "footer-max-line-length",
          rules.footerMaxLineLength.severity,
          `Footer line ${
            index + footerStart! + 1
          } must not exceed ${rules.footerMaxLineLength.max} characters (got ${line.length}).`,
        );
      }
    }
  }

  const errors = issues.filter((issue) => issue.severity === "error");
  const warnings = issues.filter((issue) => issue.severity === "warning");

  return {
    input: cleaned,
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

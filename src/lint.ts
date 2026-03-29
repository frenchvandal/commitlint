/**
 * Commit-message validation primitives built on top of the Conventional Commits format.
 *
 * @module
 */

import {
  ALLOWED_TYPES,
  BODY_MAX_LINE_LENGTH,
  CASED_LETTER_PATTERN,
  FOOTER_MAX_LINE_LENGTH,
  FOOTER_PATTERN,
  GIT_COMMENT_PATTERN,
  HEADER_MAX_LENGTH,
} from "./constants.ts";
import { parseHeader } from "./parse.ts";
import type { LintIssue, LintReport } from "./types.ts";

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
  if (!CASED_LETTER_PATTERN.test(subject)) return false;

  const first = subject[0];
  return first !== undefined &&
    first === first.toUpperCase() &&
    first !== first.toLowerCase();
}

/**
 * Validate a commit message and return a structured lint report.
 *
 * @param input The raw commit message to lint.
 * @returns A report containing the normalized input, errors, and warnings.
 *
 * @example
 * ```ts
 * import { lintCommit } from "@miscellaneous/commitlint";
 *
 * const report = lintCommit("feat: add search");
 *
 * console.log(report.valid); // true
 * console.log(report.errors.length); // 0
 * ```
 */
export function lintCommit(input: string): LintReport {
  const issues: LintIssue[] = [];
  const { body, bodyStart, cleaned, footer, footerStart, header, lines } =
    splitCommitMessage(input);

  if (header.length > HEADER_MAX_LENGTH) {
    issues.push({
      rule: "header-max-length",
      severity: "error",
      message:
        `Header must not exceed ${HEADER_MAX_LENGTH} characters (got ${header.length}).`,
    });
  }

  if (header !== header.trim()) {
    issues.push({
      rule: "header-trim",
      severity: "error",
      message: "Header must not have leading or trailing whitespace.",
    });
  }

  const parsed = parseHeader(header);

  if (parsed === undefined) {
    issues.push({
      rule: "header-pattern",
      severity: "error",
      message:
        `Header does not match Conventional Commits format: "<type>[optional scope]: <description>". Got: "${header}"`,
    });
  } else {
    if (
      !ALLOWED_TYPES.has(parsed.type as Parameters<typeof ALLOWED_TYPES.has>[0])
    ) {
      issues.push({
        rule: "type-enum",
        severity: "error",
        message: `Type "${parsed.type}" is not allowed. Allowed types: ${
          [...ALLOWED_TYPES].join(", ")
        }.`,
      });
    }

    if (parsed.type !== parsed.type.toLowerCase()) {
      issues.push({
        rule: "type-case",
        severity: "error",
        message: `Type "${parsed.type}" must be lower-case.`,
      });
    }

    if (parsed.type.trim().length === 0) {
      issues.push({
        rule: "type-empty",
        severity: "error",
        message: "Type must not be empty.",
      });
    }

    if (parsed.subject.trim().length === 0) {
      issues.push({
        rule: "subject-empty",
        severity: "error",
        message: "Subject must not be empty.",
      });
    }

    if (parsed.subject.trimEnd().endsWith(".")) {
      issues.push({
        rule: "subject-full-stop",
        severity: "error",
        message: 'Subject must not end with a full stop (".").',
      });
    }

    if (hasDisallowedSubjectCase(parsed.subject)) {
      issues.push({
        rule: "subject-case",
        severity: "error",
        message:
          "Subject must not be sentence-case, start-case, pascal-case, or upper-case.",
      });
    }
  }

  for (const [index, line] of body.entries()) {
    if (line.length > BODY_MAX_LINE_LENGTH) {
      issues.push({
        rule: "body-max-line-length",
        severity: "error",
        message: `Body line ${
          index + bodyStart + 1
        } must not exceed ${BODY_MAX_LINE_LENGTH} characters (got ${line.length}).`,
      });
    }
  }

  if (body.length > 0 && lines[1] !== "") {
    issues.push({
      rule: "body-leading-blank",
      severity: "warning",
      message: "Body must be separated from the header by a blank line.",
    });
  }

  if (footerStart !== undefined && lines[footerStart - 1] !== "") {
    issues.push({
      rule: "footer-leading-blank",
      severity: "warning",
      message:
        "Footer must be separated from the preceding section by a blank line.",
    });
  }

  for (const [index, line] of footer.entries()) {
    if (line.length > FOOTER_MAX_LINE_LENGTH) {
      issues.push({
        rule: "footer-max-line-length",
        severity: "error",
        message: `Footer line ${
          index + footerStart! + 1
        } must not exceed ${FOOTER_MAX_LINE_LENGTH} characters (got ${line.length}).`,
      });
    }
  }

  const errors = issues.filter((i) => i.severity === "error");
  const warnings = issues.filter((i) => i.severity === "warning");

  return {
    input: cleaned,
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

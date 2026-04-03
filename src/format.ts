/**
 * Terminal formatting helpers for {@link lintCommit} reports.
 *
 * @module
 */

import type {
  FormatOptions,
  LintBatchReport,
  LintIssue,
  LintReport,
} from "./types.ts";

const RESET = "\x1b[0m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const GREEN = "\x1b[32m";
const DIM = "\x1b[2m";
const BOLD = "\x1b[1m";

function createStyle(color: boolean) {
  return (text: string, ...codes: string[]) =>
    color ? `${codes.join("")}${text}${RESET}` : text;
}

function formatIssueLines(
  issue: LintIssue,
  style: (text: string, ...codes: string[]) => string,
): string[] {
  const lines: string[] = [];
  const prefix = issue.severity === "error"
    ? style("  ✖ error", RED)
    : style("  ⚠ warning", YELLOW);
  const location = issue.location === undefined
    ? ""
    : ` at ${issue.location.section} ${issue.location.line}:${issue.location.column}`;
  const rule = style(`  [${issue.rule}]${location}`, DIM);

  lines.push(`${prefix}  ${issue.message}`);
  lines.push(rule);

  for (const suggestion of issue.suggestions ?? []) {
    lines.push(style(`  ↳ ${suggestion.message}`, DIM));
  }

  lines.push("");
  return lines;
}

/**
 * Format a lint report for terminal output.
 *
 * @param report The report returned by {@link lintCommit}.
 * @param options Controls whether ANSI colors are included in the output.
 * @returns A printable terminal-friendly summary of the lint result.
 *
 * @example
 * ```ts
 * import {
 *   formatReport,
 *   lintCommit,
 * } from "@miscellaneous/commitlint";
 *
 * const output = formatReport(
 *   lintCommit("fix: add missing null check"),
 *   { color: false },
 * );
 *
 * console.log(output.includes("commit message is valid")); // true
 * ```
 */
export function formatReport(
  report: LintReport,
  options: FormatOptions = {},
): string {
  const color = options.color === true;
  const style = createStyle(color);

  const lines: string[] = [];
  lines.push("");
  lines.push(style(`  commit: ${report.input.split("\n")[0]}`, DIM));
  lines.push("");

  for (const issue of [...report.errors, ...report.warnings]) {
    lines.push(...formatIssueLines(issue, style));
  }

  const errorCount = report.errors.length;
  const warningCount = report.warnings.length;

  if (report.ignored) {
    lines.push(style("  - commit message was ignored", DIM, BOLD));
  } else if (report.valid) {
    lines.push(style("  ✔ commit message is valid", GREEN, BOLD));
  } else {
    lines.push(
      style(
        `  ✖ found ${errorCount} error${errorCount !== 1 ? "s" : ""}` +
          (warningCount > 0
            ? ` and ${warningCount} warning${warningCount !== 1 ? "s" : ""}`
            : ""),
        RED,
        BOLD,
      ),
    );
  }

  if (
    report.helpUrl !== undefined &&
    (report.errors.length > 0 || report.warnings.length > 0)
  ) {
    lines.push(style(`  help: ${report.helpUrl}`, DIM));
  }

  lines.push("");
  return lines.join("\n");
}

/**
 * Format a batch lint report for terminal output.
 *
 * @param report The report returned by {@link lintCommits}.
 * @param options Controls whether ANSI colors are included in the output.
 * @returns A printable terminal-friendly summary of the batch lint result.
 *
 * @example
 * ```ts
 * import {
 *   formatBatchReport,
 *   lintCommits,
 * } from "@miscellaneous/commitlint";
 *
 * const output = formatBatchReport(lintCommits(["feat: add search"]), {
 *   color: false,
 * });
 *
 * console.log(output.includes("commits checked")); // true
 * ```
 */
export function formatBatchReport(
  report: LintBatchReport,
  options: FormatOptions = {},
): string {
  const color = options.color === true;
  const style = createStyle(color);
  const lines: string[] = [];
  const reportsWithIssues = report.reports.filter((item) =>
    item.errors.length > 0 || item.warnings.length > 0
  );

  lines.push("");
  lines.push(
    style(
      `  commits checked: ${report.totalCount}  valid: ${report.validCount}  invalid: ${report.invalidCount}  ignored: ${report.ignoredCount}`,
      DIM,
    ),
  );
  lines.push(
    style(
      `  issues: ${report.errorCount} error${
        report.errorCount !== 1 ? "s" : ""
      }` +
        `, ${report.warningCount} warning${
          report.warningCount !== 1 ? "s" : ""
        }`,
      DIM,
    ),
  );
  lines.push("");

  for (const [index, item] of report.reports.entries()) {
    if (item.errors.length === 0 && item.warnings.length === 0) continue;

    lines.push(
      style(`  commit ${index + 1}: ${item.input.split("\n")[0]}`, BOLD),
    );
    lines.push("");

    for (const issue of [...item.errors, ...item.warnings]) {
      lines.push(...formatIssueLines(issue, style));
    }
  }

  if (report.valid) {
    lines.push(style("  ✔ all commit messages are valid", GREEN, BOLD));
  } else {
    lines.push(
      style(
        `  ✖ ${reportsWithIssues.length} commit message${
          reportsWithIssues.length !== 1 ? "s contain" : " contains"
        } issues`,
        RED,
        BOLD,
      ),
    );
  }

  if (
    report.helpUrl !== undefined &&
    (report.errorCount > 0 || report.warningCount > 0)
  ) {
    lines.push(style(`  help: ${report.helpUrl}`, DIM));
  }

  lines.push("");
  return lines.join("\n");
}

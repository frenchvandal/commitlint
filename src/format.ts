/**
 * Terminal formatting helpers for {@link lintCommit} reports.
 *
 * @module
 */

import type { FormatOptions, LintReport } from "./types.ts";

const RESET = "\x1b[0m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const GREEN = "\x1b[32m";
const DIM = "\x1b[2m";
const BOLD = "\x1b[1m";

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

  const style = (text: string, ...codes: string[]) =>
    color ? `${codes.join("")}${text}${RESET}` : text;

  const lines: string[] = [];
  lines.push("");
  lines.push(style(`  commit: ${report.input.split("\n")[0]}`, DIM));
  lines.push("");

  for (const issue of [...report.errors, ...report.warnings]) {
    const prefix = issue.severity === "error"
      ? style("  ✖ error", RED)
      : style("  ⚠ warning", YELLOW);
    const location = issue.location === undefined
      ? ""
      : ` at ${issue.location.section} ${issue.location.line}:${issue.location.column}`;
    const rule = style(`  [${issue.rule}]${location}`, DIM);
    lines.push(`${prefix}  ${issue.message}`);
    lines.push(rule);
    lines.push("");
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

  lines.push("");
  return lines.join("\n");
}

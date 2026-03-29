/**
 * Cross-runtime Conventional Commits linting primitives.
 *
 * @example
 * ```ts
 * import {
 *   formatReport,
 *   lintCommit,
 * } from "@miscellaneous/commitlint";
 *
 * const report = lintCommit("feat: add search");
 *
 * console.log(report.valid); // true
 * console.log(formatReport(report, { color: false }));
 * ```
 *
 * @module
 */
export type {
  FormatOptions,
  LintIssue,
  LintReport,
  Severity,
} from "./src/types.ts";
export { lintCommit } from "./src/lint.ts";
export { formatReport } from "./src/format.ts";

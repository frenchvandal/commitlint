/**
 * Cross-runtime Conventional Commits parsing and linting primitives.
 *
 * @example
 * ```ts
 * import {
 *   formatReport,
 *   lintCommit,
 *   parseCommit,
 * } from "@miscellaneous/commitlint";
 *
 * const report = lintCommit("feat: add search");
 * const tree = parseCommit("feat(api): add search");
 *
 * console.log(report.valid); // true
 * console.log(formatReport(report, { color: false }));
 * console.log(tree.type); // "message"
 * ```
 *
 * @module
 */
export type {
  CommitAstNode,
  CommitLiteralNode,
  CommitLiteralNodeType,
  CommitMessage,
  CommitNodeType,
  CommitParentNode,
  CommitParentNodeType,
  CommitPoint,
  CommitPosition,
  FormatOptions,
  LintIssue,
  LintOptions,
  LintPreset,
  LintReport,
  Severity,
} from "./src/types.ts";
export { lintCommit } from "./src/lint.ts";
export { formatReport } from "./src/format.ts";
export { parseCommit } from "./src/parser.ts";

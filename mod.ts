/**
 * Cross-runtime Conventional Commits parsing and linting primitives.
 *
 * @example
 * ```ts
 * import {
 *   analyzeCommit,
 *   formatReport,
 *   lintCommit,
 *   parseCommit,
 *   parseHeader,
 * } from "@miscellaneous/commitlint";
 *
 * const report = lintCommit("feat: add search");
 * const tree = parseCommit("feat(api): add search");
 * const commit = analyzeCommit("feat(api): add search");
 * const header = parseHeader("feat(api): add search");
 *
 * console.log(report.valid); // true
 * console.log(formatReport(report, { color: false }));
 * console.log(tree.type); // "message"
 * console.log(commit.summary?.scope); // "api"
 * console.log(header?.type); // "feat"
 * ```
 *
 * @module
 */
export type {
  CommitAnalysis,
  CommitAstNode,
  CommitFooter,
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
  LintIssueLocation,
  LintOptions,
  LintPreset,
  LintReport,
  LintRuleLevel,
  LintRulePlugin,
  LintRulesConfig,
  ParsedHeader,
  Severity,
} from "./src/types.ts";
export { analyzeCommit } from "./src/analyze.ts";
export { lintCommit } from "./src/lint.ts";
export { formatReport } from "./src/format.ts";
export { parseHeader } from "./src/parse.ts";
export { parseCommit } from "./src/parser.ts";

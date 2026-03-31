/**
 * Cross-runtime Conventional Commits parsing and linting primitives.
 *
 * @example
 * ```ts
 * import {
 *   analyzeCommit,
 *   BUILTIN_LINT_RULES,
 *   formatReport,
 *   lintCommits,
 *   lintCommit,
 *   lintHeader,
 *   parseCommit,
 *   parseHeader,
 *   resolveLintRules,
 * } from "@miscellaneous/commitlint";
 *
 * const report = lintCommit("feat: add search");
 * const titleReport = lintHeader("feat(api): add search");
 * const batch = lintCommits(["feat: add search", "wip: ship it"], {
 *   preset: "commitlint",
 * });
 * const tree = parseCommit("feat(api): add search");
 * const commit = analyzeCommit("feat(api): add search");
 * const header = parseHeader("feat(api): add search");
 * const rules = resolveLintRules({ preset: "commitlint" });
 *
 * console.log(report.valid); // true
 * console.log(titleReport.valid); // true
 * console.log(batch.invalidCount); // 1
 * console.log(formatReport(report, { color: false }));
 * console.log(tree.type); // "message"
 * console.log(commit.summary?.scope); // "api"
 * console.log(header?.type); // "feat"
 * console.log(BUILTIN_LINT_RULES[0]?.name); // "header-pattern"
 * console.log(rules.rules.find((rule) => rule.name === "type-enum")?.level);
 * // "error"
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
  CommitTypeDefinition,
  FormatOptions,
  LintBatchReport,
  LintBuiltinRuleDefinition,
  LintBuiltinRuleName,
  LintIgnorePredicate,
  LintIssue,
  LintIssueLocation,
  LintOptions,
  LintPreset,
  LintReport,
  LintRuleLevel,
  LintRuleOptionValue,
  LintRulePlugin,
  LintRulesConfig,
  ParsedHeader,
  ResolvedLintConfig,
  ResolvedLintRule,
  Severity,
} from "./src/types.ts";
export { DEFAULT_COMMIT_TYPES } from "./src/commit_types.ts";
export { analyzeCommit } from "./src/analyze.ts";
export { BUILTIN_LINT_RULES, resolveLintRules } from "./src/rules.ts";
export { lintCommit, lintCommits, lintHeader } from "./src/lint.ts";
export { formatReport } from "./src/format.ts";
export { parseHeader } from "./src/parse.ts";
export { parseCommit } from "./src/parser.ts";

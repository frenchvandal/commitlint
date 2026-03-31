/**
 * Public type definitions for commit lint reports and formatting options.
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
} from "./parser_types.ts";

/** The severity level assigned to a lint issue. */
export type Severity = "error" | "warning";
/** The configurable level assigned to a lint rule. */
export type LintRuleLevel = Severity | "off";

/** Built-in lint presets supported by {@link lintCommit}. */
export type LintPreset = "conventional-commits" | "commitlint";
/** The stable names of the built-in lint rules. */
export type LintBuiltinRuleName =
  | "header-pattern"
  | "header-trim"
  | "type-enum"
  | "type-case"
  | "scope-enum"
  | "scope-case"
  | "scope-empty"
  | "subject-case"
  | "subject-full-stop"
  | "header-max-length"
  | "body-max-line-length"
  | "footer-max-line-length"
  | "body-leading-blank"
  | "footer-leading-blank"
  | "footer-token-enum"
  | "footer-token-required"
  | "breaking-change-description-required";

/** Metadata describing a known commit type. */
export type CommitTypeDefinition = {
  /** The raw commit type name, such as `feat`. */
  readonly name: string;
  /** A concise human-readable description of the type. */
  readonly description: string;
  /** An optional category title suitable for UIs or changelog headings. */
  readonly title?: string;
};

/** A structured location attached to a lint issue. */
export type LintIssueLocation = {
  /** The logical commit section that emitted the issue. */
  readonly section: "header" | "body" | "footer";
  /** The 1-based line number in the cleaned commit message. */
  readonly line: number;
  /** The 1-based column number in the cleaned commit message. */
  readonly column: number;
  /** The optional length of the highlighted region. */
  readonly length?: number;
};

/** A single lint issue emitted by the validator. */
export type LintIssue = {
  /** The stable rule identifier, such as `type-enum`. */
  readonly rule: string;
  /** Whether the issue is an error or a warning. */
  readonly severity: Severity;
  /** A human-readable explanation of the issue. */
  readonly message: string;
  /** The structured location of the issue in the cleaned commit message, when available. */
  readonly location?: LintIssueLocation;
};

/** A parsed footer token captured from the commit footer block. */
export type CommitFooter = {
  /** The footer token, such as `Refs` or `BREAKING CHANGE`. */
  readonly token: string;
  /** The separator used by the footer token. */
  readonly separator: ": " | " #";
  /** The footer value, including continuation lines when present. */
  readonly value: string;
  /** Whether this footer represents a breaking-change note. */
  readonly breaking: boolean;
};

/** A semantic summary of a commit message without policy validation. */
export type CommitAnalysis = {
  /** The normalized input after Git comment lines and trailing whitespace are removed. */
  readonly input: string;
  /** The raw header line. */
  readonly header: string;
  /** The parsed Conventional Commits header fields, when the header is valid. */
  readonly summary: ParsedHeader | undefined;
  /** The body text, when present. */
  readonly body: string | undefined;
  /** The raw footer block, when present. */
  readonly footer: string | undefined;
  /** The parsed footer entries discovered in the footer block. */
  readonly footers: ReadonlyArray<CommitFooter>;
};

/** The structured report returned by {@link lintCommit}. */
export type LintReport = {
  /** The normalized input after Git comment lines and trailing whitespace are removed. */
  readonly input: string;
  /** Whether the message matched an ignore predicate and skipped lint rules. */
  readonly ignored: boolean;
  /** Whether the commit message contains no errors. Warnings do not make the report invalid. */
  readonly valid: boolean;
  /** All error-level issues found in the message. */
  readonly errors: ReadonlyArray<LintIssue>;
  /** All warning-level issues found in the message. */
  readonly warnings: ReadonlyArray<LintIssue>;
  /** The semantic commit analysis used during linting, when available. */
  readonly analysis?: CommitAnalysis;
};

/** Primitive option values surfaced by {@link resolveLintRules}. */
export type LintRuleOptionValue =
  | boolean
  | number
  | string
  | ReadonlyArray<string>;

/** Metadata describing a built-in lint rule. */
export type LintBuiltinRuleDefinition = {
  /** The stable built-in rule name. */
  readonly name: LintBuiltinRuleName;
  /** A concise human-readable description of the rule. */
  readonly description: string;
  /** Whether callers can tune or disable the rule through {@link LintOptions.rules}. */
  readonly configurable: boolean;
};

/** A built-in lint rule after presets and overrides have been resolved. */
export type ResolvedLintRule = LintBuiltinRuleDefinition & {
  /** The effective level after applying the preset and any overrides. */
  readonly level: LintRuleLevel;
  /** Effective rule options, when the rule accepts additional values. */
  readonly options?: Readonly<Record<string, LintRuleOptionValue>>;
};

/** The effective built-in lint rules for a resolved preset and override set. */
export type ResolvedLintConfig = {
  /** The preset selected for the resolved rule set. */
  readonly preset: LintPreset;
  /** The built-in rules in their stable evaluation order. */
  readonly rules: ReadonlyArray<ResolvedLintRule>;
};

/** The aggregate result returned by {@link lintCommits}. */
export type LintBatchReport = {
  /** Whether every linted message was valid or ignored. */
  readonly valid: boolean;
  /** The number of commit messages passed to the batch linter. */
  readonly totalCount: number;
  /** The number of reports that contain no errors, including ignored messages. */
  readonly validCount: number;
  /** The number of reports that contain at least one error. */
  readonly invalidCount: number;
  /** The number of reports skipped by ignore predicates. */
  readonly ignoredCount: number;
  /** The total number of error-level issues across all reports. */
  readonly errorCount: number;
  /** The total number of warning-level issues across all reports. */
  readonly warningCount: number;
  /** The per-message lint reports in input order. */
  readonly reports: ReadonlyArray<LintReport>;
};

/** Typed overrides for the built-in lint rules. */
export type LintRulesConfig = {
  /** Override the `type-enum` rule. */
  readonly "type-enum"?: {
    readonly level?: LintRuleLevel;
    readonly allowedTypes?: ReadonlyArray<string>;
    readonly suggest?: boolean;
  };
  /** Override the `type-case` rule. */
  readonly "type-case"?: {
    readonly level?: LintRuleLevel;
  };
  /** Override the `scope-enum` rule. */
  readonly "scope-enum"?: {
    readonly level?: LintRuleLevel;
    readonly allowedScopes?: ReadonlyArray<string>;
    readonly suggest?: boolean;
  };
  /** Override the `scope-case` rule. */
  readonly "scope-case"?: {
    readonly level?: LintRuleLevel;
  };
  /** Override the `scope-empty` rule. */
  readonly "scope-empty"?: {
    readonly level?: LintRuleLevel;
  };
  /** Override the `subject-case` rule. */
  readonly "subject-case"?: {
    readonly level?: LintRuleLevel;
  };
  /** Override the `subject-full-stop` rule. */
  readonly "subject-full-stop"?: {
    readonly level?: LintRuleLevel;
  };
  /** Override the `header-max-length` rule. */
  readonly "header-max-length"?: {
    readonly level?: LintRuleLevel;
    readonly max?: number;
  };
  /** Override the `body-max-line-length` rule. */
  readonly "body-max-line-length"?: {
    readonly level?: LintRuleLevel;
    readonly max?: number;
  };
  /** Override the `footer-max-line-length` rule. */
  readonly "footer-max-line-length"?: {
    readonly level?: LintRuleLevel;
    readonly max?: number;
  };
  /** Override the `body-leading-blank` rule. */
  readonly "body-leading-blank"?: {
    readonly level?: LintRuleLevel;
  };
  /** Override the `footer-leading-blank` rule. */
  readonly "footer-leading-blank"?: {
    readonly level?: LintRuleLevel;
  };
  /** Override the `footer-token-enum` rule. */
  readonly "footer-token-enum"?: {
    readonly level?: LintRuleLevel;
    /** Include breaking-change footer tokens explicitly when you want to allow them. */
    readonly allowedTokens?: ReadonlyArray<string>;
    readonly suggest?: boolean;
  };
  /** Override the `footer-token-required` rule. */
  readonly "footer-token-required"?: {
    readonly level?: LintRuleLevel;
    readonly tokens?: ReadonlyArray<string>;
  };
  /** Override the `breaking-change-description-required` rule. */
  readonly "breaking-change-description-required"?: {
    readonly level?: LintRuleLevel;
  };
};

/** A lightweight custom lint callback executed after the built-in rules. */
export type LintRulePlugin = (
  commit: CommitAnalysis,
) => void | LintIssue | ReadonlyArray<LintIssue>;

/** A predicate that can skip linting for matching commit messages. */
export type LintIgnorePredicate = (commit: CommitAnalysis) => boolean;

/** Options for {@link lintCommit}. */
export type LintOptions = {
  /**
   * The built-in rule preset to apply.
   *
   * Available presets:
   * - `"conventional-commits"`: the default specification-focused rules
   * - `"commitlint"`: mirrors `@commitlint/config-conventional`
   *
   * Defaults to `"conventional-commits"`.
   */
  readonly preset?: LintPreset;
  /**
   * Optional typed overrides for the built-in lint rules.
   *
   * Rules are merged on top of the selected preset. Set `level: "off"` to
   * disable a rule. When an override enables a rule that is inactive in the
   * selected preset and omits `level`, the rule falls back to the default
   * severity used by the `"commitlint"` preset.
   */
  readonly rules?: LintRulesConfig;
  /**
   * Whether the built-in ignore predicates should skip special workflow commits.
   *
   * When enabled, messages such as `fixup!`, `squash!`, merge commits, and
   * Git-generated revert commits are reported as valid without applying rules.
   *
   * Defaults to `false`.
   */
  readonly defaultIgnores?: boolean;
  /**
   * Optional custom ignore predicates evaluated before lint rules.
   *
   * If any predicate returns `true`, the message is reported as ignored and no
   * rules or plugins are executed.
   */
  readonly ignores?: ReadonlyArray<LintIgnorePredicate>;
  /**
   * Optional custom lint callbacks executed after the built-in rules.
   *
   * Plugins receive the semantic commit analysis and may return one or more
   * additional issues.
   */
  readonly plugins?: ReadonlyArray<LintRulePlugin>;
};

/** Parsed data extracted from the commit header. */
export type ParsedHeader = {
  /** The commit type, such as `feat` or `fix`. */
  readonly type: string;
  /** The optional scope captured from the header. */
  readonly scope: string | undefined;
  /** Whether the header contains the `!` breaking-change marker. */
  readonly breaking: boolean;
  /** The subject portion of the commit header. */
  readonly subject: string;
};

/** Formatting options for {@link formatReport}. */
export type FormatOptions = {
  /** Whether ANSI colors should be included in the output. */
  readonly color?: boolean;
};

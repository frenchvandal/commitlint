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
  /** Whether the commit message contains no errors. Warnings do not make the report invalid. */
  readonly valid: boolean;
  /** All error-level issues found in the message. */
  readonly errors: ReadonlyArray<LintIssue>;
  /** All warning-level issues found in the message. */
  readonly warnings: ReadonlyArray<LintIssue>;
  /** The semantic commit analysis used during linting, when available. */
  readonly analysis?: CommitAnalysis;
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
};

/** A lightweight custom lint callback executed after the built-in rules. */
export type LintRulePlugin = (
  commit: CommitAnalysis,
) => void | LintIssue | ReadonlyArray<LintIssue>;

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
   * disable a rule.
   */
  readonly rules?: LintRulesConfig;
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

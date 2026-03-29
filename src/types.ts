/**
 * Public type definitions for commit lint reports and formatting options.
 *
 * @module
 */

/** The severity level assigned to a lint issue. */
export type Severity = "error" | "warning";

/** A single lint issue emitted by the validator. */
export type LintIssue = {
  /** The stable rule identifier, such as `type-enum`. */
  readonly rule: string;
  /** Whether the issue is an error or a warning. */
  readonly severity: Severity;
  /** A human-readable explanation of the issue. */
  readonly message: string;
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

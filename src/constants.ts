/**
 * Shared constants and regular expressions used by the commit parser and linter.
 *
 * @module
 */

/** The default commit types allowed by this package. */
export const ALLOWED_TYPE_LIST = [
  "build",
  "chore",
  "ci",
  "docs",
  "feat",
  "fix",
  "perf",
  "refactor",
  "revert",
  "style",
  "test",
] as const;

/** A `Set` view of {@link ALLOWED_TYPE_LIST} for membership checks. */
export const ALLOWED_TYPES = new Set(ALLOWED_TYPE_LIST);

/** The maximum length allowed for the first line of a commit message. */
export const HEADER_MAX_LENGTH = 100 as const;
/** The maximum length allowed for body lines. */
export const BODY_MAX_LINE_LENGTH = 100 as const;
/** The maximum length allowed for footer lines. */
export const FOOTER_MAX_LINE_LENGTH = 100 as const;

/** Matches a Conventional Commits header and captures its structured parts. */
export const HEADER_PATTERN =
  /^(?<type>[a-zA-Z]+)(?:\((?<scope>[^()]+)\))?(?<breaking>!)?:[ \t]+(?<subject>.+)$/;
/** Matches Git comment lines such as those found in `.git/COMMIT_EDITMSG`. */
export const GIT_COMMENT_PATTERN = /^#(?: |$)/;
/** Matches footer lines like `Refs: #123` or `BREAKING CHANGE: ...`. */
export const FOOTER_PATTERN =
  /^(?:BREAKING CHANGE|BREAKING-CHANGE|[A-Za-z][A-Za-z-]*)(?:: | #).+/u;
/** Matches a Unicode cased letter at the start of a string. */
export const CASED_LETTER_PATTERN = /^[\p{Ll}\p{Lu}\p{Lt}]/u;

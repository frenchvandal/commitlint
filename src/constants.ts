/**
 * Shared constants and regular expressions used by the commit parser and linter.
 *
 * @module
 */

/** The maximum header length mirrored from `@commitlint/config-conventional`. */
export const COMMITLINT_HEADER_MAX_LENGTH = 100 as const;
/** The maximum body line length mirrored from `@commitlint/config-conventional`. */
export const COMMITLINT_BODY_MAX_LINE_LENGTH = 100 as const;
/** The maximum footer line length mirrored from `@commitlint/config-conventional`. */
export const COMMITLINT_FOOTER_MAX_LINE_LENGTH = 100 as const;

/** Matches a Conventional Commits header and captures its structured parts. */
export const HEADER_PATTERN =
  /^(?<type>[A-Za-z][A-Za-z-]*)(?:\((?<scope>[^()]+)\))?(?<breaking>!)?:[ \t]+(?<subject>.+)$/;
/** Matches Git comment lines such as those found in `.git/COMMIT_EDITMSG`. */
export const GIT_COMMENT_PATTERN = /^#(?: |$)/;
/** Matches footer lines like `Refs: #123` or `BREAKING CHANGE: ...`. */
export const FOOTER_PATTERN =
  /^(?:BREAKING CHANGE|BREAKING-CHANGE|[A-Za-z][A-Za-z-]*)(?::(?: |$)| #).*$/u;
/** Matches a Unicode cased letter at the start of a string. */
export const CASED_LETTER_PATTERN = /^[\p{Ll}\p{Lu}\p{Lt}]/u;

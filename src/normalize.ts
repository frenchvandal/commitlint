/**
 * Best-effort commit-message normalization helpers.
 *
 * @module
 */

import { cleanCommitInput } from "./message.ts";
import { parseHeader } from "./parse.ts";
import type { NormalizeOptions } from "./types.ts";

/**
 * Normalize a commit message without applying lint rules.
 *
 * The normalizer is intentionally conservative: it cleans Git comment lines,
 * trims surrounding header whitespace, lower-cases the type and scopes, and
 * optionally removes a trailing full stop from the subject. If the header still
 * cannot be parsed after trimming, the cleaned input is returned unchanged.
 *
 * @param input The raw commit message to normalize.
 * @param options Optional scope and subject normalization settings.
 * @returns A normalized commit message string.
 *
 * @example
 * ```ts
 * import { normalizeCommit } from "@miscellaneous/commitlint";
 *
 * const normalized = normalizeCommit(" Fix(API, Parser): Add search.  ");
 *
 * console.log(normalized); // “fix(api,parser): Add search”
 * ```
 */
export function normalizeCommit(
  input: string,
  options: NormalizeOptions = {},
): string {
  const cleaned = cleanCommitInput(input);
  const lines = cleaned.split("\n");
  const [rawHeader = "", ...remainingLines] = lines;
  const trimmedHeader = rawHeader.trim();
  const parsed = parseHeader(trimmedHeader, options);

  if (parsed === undefined) {
    return [trimmedHeader, ...remainingLines].join("\n");
  }

  const preferredScopeDelimiter = options.preferredScopeDelimiter ?? ",";
  const normalizedSubject = options.removeSubjectFullStop === false
    ? parsed.subject.trim()
    : parsed.subject.trim().replace(/\.$/u, "");
  const normalizedScope = parsed.scopes.length === 0
    ? ""
    : `(${
      parsed.scopes.map((scope) => scope.toLowerCase()).join(
        preferredScopeDelimiter,
      )
    })`;
  const normalizedHeader = `${parsed.type.toLowerCase()}${normalizedScope}${
    parsed.breaking ? "!" : ""
  }: ${normalizedSubject}`;

  return [normalizedHeader, ...remainingLines].join("\n");
}

/**
 * Helpers for parsing the header line of a Conventional Commit.
 *
 * @module
 */

import { HEADER_PATTERN } from "./constants.ts";
import type { ParsedHeader, ParseHeaderOptions } from "./types.ts";

const DEFAULT_SCOPE_DELIMITERS = [","] as const;

export type ParsedScopeSegment = {
  readonly value: string;
  readonly start: number;
  readonly length: number;
};

function resolveScopeDelimiters(
  options: ParseHeaderOptions,
): ReadonlyArray<string> {
  const delimiters = options.scopeDelimiters?.filter((delimiter) =>
    delimiter.length > 0
  );

  return delimiters === undefined || delimiters.length === 0
    ? DEFAULT_SCOPE_DELIMITERS
    : delimiters;
}

function matchingDelimiter(
  input: string,
  index: number,
  delimiters: ReadonlyArray<string>,
): string | undefined {
  for (const delimiter of delimiters) {
    if (input.startsWith(delimiter, index)) return delimiter;
  }

  return undefined;
}

export function splitScopeSegments(
  scope: string,
  options: ParseHeaderOptions = {},
): ReadonlyArray<ParsedScopeSegment> | undefined {
  const delimiters = resolveScopeDelimiters(options);
  const segments: ParsedScopeSegment[] = [];
  let segmentStart = 0;
  let index = 0;

  const pushSegment = (segmentEnd: number) => {
    const rawValue = scope.slice(segmentStart, segmentEnd);
    const trimmed = rawValue.trim();

    if (trimmed.length === 0) {
      return false;
    }

    const leadingWhitespace = rawValue.length - rawValue.trimStart().length;
    segments.push({
      value: trimmed,
      start: segmentStart + leadingWhitespace,
      length: trimmed.length,
    });
    return true;
  };

  while (index < scope.length) {
    const delimiter = matchingDelimiter(scope, index, delimiters);

    if (delimiter === undefined) {
      index += 1;
      continue;
    }

    if (!pushSegment(index)) return undefined;
    index += delimiter.length;
    segmentStart = index;
  }

  if (!pushSegment(scope.length)) return undefined;
  return segments;
}

/**
 * Parse the first line of a Conventional Commit.
 *
 * @param header The header line to parse.
 * @param options Optional scope-parsing settings for multi-scope headers.
 * @returns The parsed header fields, or `undefined` when the header does not match the expected format.
 *
 * @example
 * ```ts
 * import { parseHeader } from "./parse.ts";
 *
 * const parsed = parseHeader("feat(api)!: add search endpoint");
 *
 * console.log(parsed?.type); // “feat”
 * console.log(parsed?.scope); // “api”
 * console.log(parsed?.breaking); // true
 * ```
 */
export function parseHeader(
  header: string,
  options: ParseHeaderOptions = {},
): ParsedHeader | undefined {
  const match = HEADER_PATTERN.exec(header);
  if (match === null) return undefined;

  const groups = match.groups as Record<string, string | undefined>;
  const type = groups["type"] ?? "";
  const scope = groups["scope"];
  const parsedScopes = scope === undefined
    ? []
    : splitScopeSegments(scope, options);
  if (parsedScopes === undefined) return undefined;
  const breaking = groups["breaking"] === "!";
  const subject = groups["subject"] ?? "";

  return {
    type,
    scope,
    scopes: parsedScopes.map((segment) => segment.value),
    breaking,
    subject,
  };
}

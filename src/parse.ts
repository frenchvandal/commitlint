/**
 * Helpers for parsing the header line of a Conventional Commit.
 *
 * @module
 */

import { HEADER_PATTERN } from "./constants.ts";
import type { ParsedHeader } from "./types.ts";

/**
 * Parse the first line of a Conventional Commit.
 *
 * @param header The header line to parse.
 * @returns The parsed header fields, or `undefined` when the header does not match the expected format.
 *
 * @example
 * ```ts
 * import { parseHeader } from "./parse.ts";
 *
 * const parsed = parseHeader("feat(api)!: add search endpoint");
 *
 * console.log(parsed?.type); // "feat"
 * console.log(parsed?.scope); // "api"
 * console.log(parsed?.breaking); // true
 * ```
 */
export function parseHeader(header: string): ParsedHeader | undefined {
  const match = HEADER_PATTERN.exec(header);
  if (match === null) return undefined;

  const groups = match.groups as Record<string, string | undefined>;
  const type = groups["type"] ?? "";
  const scope = groups["scope"];
  const breaking = groups["breaking"] === "!";
  const subject = groups["subject"] ?? "";

  return { type, scope, breaking, subject };
}

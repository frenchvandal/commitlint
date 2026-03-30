/**
 * Semantic commit-message analysis helpers.
 *
 * @module
 */

import { parseFooterLines, splitCommitMessage } from "./message.ts";
import { parseHeader } from "./parse.ts";
import type { CommitAnalysis } from "./types.ts";

/**
 * Analyze a commit message into semantic sections without applying lint rules.
 *
 * Unlike {@link parseCommit}, this function is best-effort and does not throw on
 * malformed headers. It is useful when you need normalized commit sections for
 * editor tooling, custom rules, or UI previews.
 *
 * @param input The raw commit message to analyze.
 * @returns The cleaned message, parsed header summary, body text, and footers.
 *
 * @example
 * ```ts
 * import { analyzeCommit } from "@miscellaneous/commitlint";
 *
 * const commit = analyzeCommit(
 *   "feat(api)!: add search\n\nBREAKING CHANGE: clients must re-authenticate",
 * );
 *
 * console.log(commit.summary?.type); // "feat"
 * console.log(commit.footers[0]?.breaking); // true
 * ```
 */
export function analyzeCommit(input: string): CommitAnalysis {
  const sections = splitCommitMessage(input);
  const body = sections.body.length === 0
    ? undefined
    : sections.body.join("\n");
  const footer = sections.footer.length === 0
    ? undefined
    : sections.footer.join("\n");

  return {
    input: sections.cleaned,
    header: sections.header,
    summary: parseHeader(sections.header),
    body,
    footer,
    footers: parseFooterLines(sections.footer),
  };
}

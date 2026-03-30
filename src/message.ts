/**
 * Shared commit-message normalization and section-splitting helpers.
 *
 * @module
 */

import { FOOTER_PATTERN, GIT_COMMENT_PATTERN } from "./constants.ts";
import type { CommitFooter } from "./types.ts";

export type CommitSections = {
  readonly cleaned: string;
  readonly lines: ReadonlyArray<string>;
  readonly header: string;
  readonly body: ReadonlyArray<string>;
  readonly bodyStart: number;
  readonly footer: ReadonlyArray<string>;
  readonly footerStart: number | undefined;
};

const FOOTER_LINE_PATTERN =
  /^(?<token>BREAKING CHANGE|BREAKING-CHANGE|[A-Za-z][A-Za-z-]*)(?<separator>: | #)(?<value>.*)$/u;

export function cleanCommitInput(input: string): string {
  return input
    .split("\n")
    .filter((line) => !GIT_COMMENT_PATTERN.test(line))
    .join("\n")
    .trimEnd();
}

export function findFooterStart(
  lines: ReadonlyArray<string>,
): number | undefined {
  let footerStart: number | undefined;

  for (let index = lines.length - 1; index >= 1; index -= 1) {
    const line = lines[index] ?? "";

    if (line === "") {
      if (footerStart !== undefined) return footerStart;
      continue;
    }

    if (FOOTER_PATTERN.test(line)) {
      footerStart = index;
      continue;
    }

    if (footerStart !== undefined) return footerStart;
  }

  return footerStart;
}

export function splitCommitMessage(input: string): CommitSections {
  const cleaned = cleanCommitInput(input);
  const lines = cleaned.split("\n");
  const header = lines[0] ?? "";
  const footerStart = findFooterStart(lines);
  const bodyStart = lines[1] === "" ? 2 : 1;
  const bodyEnd = footerStart === undefined
    ? lines.length
    : lines[footerStart - 1] === ""
    ? footerStart - 1
    : footerStart;

  return {
    cleaned,
    lines,
    header,
    body: lines.slice(bodyStart, bodyEnd),
    bodyStart,
    footer: footerStart === undefined ? [] : lines.slice(footerStart),
    footerStart,
  };
}

export function parseFooterLines(
  lines: ReadonlyArray<string>,
): ReadonlyArray<CommitFooter> {
  const footers: CommitFooter[] = [];
  let current: CommitFooter | undefined;

  const pushCurrent = () => {
    if (current !== undefined) {
      footers.push(current);
      current = undefined;
    }
  };

  for (const line of lines) {
    const match = FOOTER_LINE_PATTERN.exec(line);

    if (match !== null) {
      pushCurrent();

      const groups = match.groups as Record<string, string>;
      const token = groups["token"] ?? "";
      const separator = (groups["separator"] ?? ": ") as ": " | " #";
      const value = groups["value"] ?? "";

      current = {
        token,
        separator,
        value,
        breaking: token === "BREAKING CHANGE" || token === "BREAKING-CHANGE",
      };
      continue;
    }

    if (current !== undefined) {
      current = {
        ...current,
        value: current.value === "" ? line : `${current.value}\n${line}`,
      };
    }
  }

  pushCurrent();
  return footers;
}

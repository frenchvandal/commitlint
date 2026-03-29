import { assertEquals, assertMatch } from "@std/assert";

import { formatReport } from "./format.ts";
import type { LintReport } from "./types.ts";

const VALID_REPORT: LintReport = {
  input: "feat: add search",
  valid: true,
  errors: [],
  warnings: [],
};

Deno.test("formatReport renders valid reports", () => {
  const output = formatReport(VALID_REPORT, { color: false });

  assertMatch(output, /commit: feat: add search/);
  assertMatch(output, /commit message is valid/);
});

Deno.test("formatReport omits ANSI codes when color is disabled", () => {
  const output = formatReport(VALID_REPORT, { color: false });

  assertEquals(output.includes("\x1b["), false);
});

Deno.test("formatReport renders errors and warnings", () => {
  const output = formatReport({
    input: "wip: ship it",
    valid: false,
    errors: [
      {
        rule: "type-enum",
        severity: "error",
        message: 'Type "wip" is not allowed.',
      },
    ],
    warnings: [
      {
        rule: "body-leading-blank",
        severity: "warning",
        message: "Body must be separated from the header by a blank line.",
      },
    ],
  }, { color: false });

  assertMatch(output, /type-enum/);
  assertMatch(output, /body-leading-blank/);
  assertMatch(output, /found 1 error and 1 warning/);
});

Deno.test("formatReport includes ANSI codes when color is enabled", () => {
  const output = formatReport(VALID_REPORT, { color: true });

  assertEquals(output.includes("\x1b[32m"), true);
  assertEquals(output.includes("\x1b[1m"), true);
});

import { assertEquals, assertMatch } from "@std/assert";

import { formatBatchReport, formatReport } from "./format.ts";
import type { LintBatchReport, LintReport } from "./types.ts";

const VALID_REPORT: LintReport = {
  input: "feat: add search",
  ignored: false,
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
    ignored: false,
    valid: false,
    errors: [
      {
        rule: "type-enum",
        severity: "error",
        message: "Type “wip” is not allowed.",
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

Deno.test("formatReport renders issue locations when available", () => {
  const output = formatReport({
    input: "fix: bug",
    ignored: false,
    valid: false,
    errors: [{
      rule: "header-max-length",
      severity: "error",
      message: "Header is too long.",
      location: {
        section: "header",
        line: 1,
        column: 73,
      },
    }],
    warnings: [],
  }, { color: false });

  assertMatch(output, /\[header-max-length\] at header 1:73/);
});

Deno.test("formatReport renders suggestions and help URLs", () => {
  const output = formatReport({
    input: "feature: add search",
    ignored: false,
    valid: false,
    errors: [{
      rule: "type-enum",
      severity: "error",
      message: "Type “feature” is not allowed. Did you mean “feat”?",
      suggestions: [{
        message: "Replace with “feat”.",
      }],
    }],
    warnings: [],
    helpUrl: "https://example.com/commits",
  }, { color: false });

  assertMatch(output, /Replace with “feat”/);
  assertMatch(output, /help: https:\/\/example.com\/commits/);
});

Deno.test("formatReport renders ignored reports", () => {
  const output = formatReport({
    input: "fixup! feat: add search",
    ignored: true,
    valid: true,
    errors: [],
    warnings: [],
  }, { color: false });

  assertMatch(output, /commit message was ignored/);
});

Deno.test("formatBatchReport renders aggregate summaries", () => {
  const batch: LintBatchReport = {
    valid: false,
    totalCount: 2,
    validCount: 1,
    invalidCount: 1,
    ignoredCount: 0,
    errorCount: 1,
    warningCount: 0,
    reports: [{
      input: "feat: add search",
      ignored: false,
      valid: true,
      errors: [],
      warnings: [],
    }, {
      input: "wip: ship it",
      ignored: false,
      valid: false,
      errors: [{
        rule: "type-enum",
        severity: "error",
        message: "Type “wip” is not allowed.",
      }],
      warnings: [],
      helpUrl: "https://example.com/commits",
    }],
    helpUrl: "https://example.com/commits",
  };

  const output = formatBatchReport(batch, { color: false });

  assertMatch(output, /commits checked: 2/);
  assertMatch(output, /commit 2: wip: ship it/);
  assertMatch(output, /help: https:\/\/example.com\/commits/);
});

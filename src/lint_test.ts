import { assertEquals } from "@std/assert";

import { lintCommit } from "../mod.ts";

Deno.test("accepts a valid commit header", () => {
  const report = lintCommit("feat(parser): add array support");

  assertEquals(report.valid, true);
  assertEquals(report.errors, []);
  assertEquals(report.warnings, []);
});

Deno.test("rejects an unknown commit type", () => {
  const report = lintCommit("wip: ship it");

  assertEquals(report.valid, false);
  assertEquals(report.errors.some((issue) => issue.rule === "type-enum"), true);
});

Deno.test("rejects disallowed subject case", () => {
  const report = lintCommit("fix: Add search support");

  assertEquals(
    report.errors.some((issue) => issue.rule === "subject-case"),
    true,
  );
});

Deno.test("rejects malformed headers", () => {
  const report = lintCommit("fix add search support");

  assertEquals(
    report.errors.some((issue) => issue.rule === "header-pattern"),
    true,
  );
});

Deno.test("rejects types that are not lower-case", () => {
  const report = lintCommit("Fix: add search support");

  assertEquals(
    report.errors.some((issue) => issue.rule === "type-case"),
    true,
  );
});

Deno.test("rejects headers longer than the configured limit", () => {
  const report = lintCommit(`fix: ${"a".repeat(96)}`);

  assertEquals(
    report.errors.some((issue) => issue.rule === "header-max-length"),
    true,
  );
});

Deno.test("rejects subjects that end with a full stop", () => {
  const report = lintCommit("fix: add search support.");

  assertEquals(
    report.errors.some((issue) => issue.rule === "subject-full-stop"),
    true,
  );
});

Deno.test("rejects headers with surrounding whitespace", () => {
  const report = lintCommit(" fix: add search support");

  assertEquals(
    report.errors.some((issue) => issue.rule === "header-trim"),
    true,
  );
});

Deno.test("warns when the body is not separated by a blank line", () => {
  const report = lintCommit("fix: handle edge case\nBody text");

  assertEquals(report.valid, true);
  assertEquals(
    report.warnings.some((issue) => issue.rule === "body-leading-blank"),
    true,
  );
});

Deno.test("warns when the footer is not separated by a blank line", () => {
  const report = lintCommit("fix: handle edge case\n\nBody text\nRefs: #123");

  assertEquals(
    report.warnings.some((issue) => issue.rule === "footer-leading-blank"),
    true,
  );
});

Deno.test("does not treat a footer as a body line when a blank line is present", () => {
  const report = lintCommit("fix: handle edge case\n\nRefs: #123");

  assertEquals(report.valid, true);
  assertEquals(report.warnings, []);
});

Deno.test("checks body and footer line lengths separately", () => {
  const bodyReport = lintCommit(`fix: handle edge case\n\n${"a".repeat(101)}`);
  const footerReport = lintCommit(
    `fix: handle edge case\n\nBREAKING CHANGE: ${"a".repeat(84)}`,
  );

  assertEquals(
    bodyReport.errors.some((issue) => issue.rule === "body-max-line-length"),
    true,
  );
  assertEquals(
    footerReport.errors.some((issue) =>
      issue.rule === "footer-max-line-length"
    ),
    true,
  );
});

Deno.test("strips git comment lines from the cleaned input", () => {
  const report = lintCommit("fix: handle edge case\n# Please enter a message");

  assertEquals(report.input.includes("# Please enter a message"), false);
});

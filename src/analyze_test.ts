import { assertEquals } from "@std/assert";

import { analyzeCommit } from "../mod.ts";

Deno.test("analyzeCommit extracts semantic sections", () => {
  const commit = analyzeCommit(
    "feat(api)!: add search\n\nExplain the behavior.\n\nRefs: #123",
  );

  assertEquals(commit.summary, {
    type: "feat",
    scope: "api",
    breaking: true,
    subject: "add search",
  });
  assertEquals(commit.body, "Explain the behavior.");
  assertEquals(commit.footer, "Refs: #123");
  assertEquals(commit.footers, [{
    token: "Refs",
    separator: ": ",
    value: "#123",
    breaking: false,
  }]);
});

Deno.test("analyzeCommit keeps invalid headers best-effort", () => {
  const commit = analyzeCommit("not conventional\n\nRefs #123");

  assertEquals(commit.header, "not conventional");
  assertEquals(commit.summary, undefined);
  assertEquals(commit.footers, [{
    token: "Refs",
    separator: " #",
    value: "123",
    breaking: false,
  }]);
});

Deno.test("analyzeCommit folds multiline breaking footers", () => {
  const commit = analyzeCommit(
    "fix: patch bug\n\nBREAKING CHANGE: first line\n second line",
  );

  assertEquals(commit.footers, [{
    token: "BREAKING CHANGE",
    separator: ": ",
    value: "first line\n second line",
    breaking: true,
  }]);
});

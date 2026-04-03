import { assertEquals } from "@std/assert";

import { normalizeCommit } from "../mod.ts";

Deno.test("normalizeCommit normalizes header casing and punctuation", () => {
  const normalized = normalizeCommit(" Fix(API, Parser): Add search.  ");

  assertEquals(normalized, "fix(api,parser): Add search");
});

Deno.test("normalizeCommit preserves the body and footer", () => {
  const normalized = normalizeCommit(
    " FIX(API): Add search.\n\nExplain the behavior.\n\nRefs: #123",
  );

  assertEquals(
    normalized,
    "fix(api): Add search\n\nExplain the behavior.\n\nRefs: #123",
  );
});

Deno.test("normalizeCommit falls back to cleaned input for invalid headers", () => {
  const normalized = normalizeCommit(" not conventional");

  assertEquals(normalized, "not conventional");
});

import { assertEquals } from "@std/assert";

import { parseHeader } from "./parse.ts";

Deno.test("parseHeader extracts type, scope, and breaking marker", () => {
  const parsed = parseHeader("feat(api)!: add search endpoint");

  assertEquals(parsed, {
    type: "feat",
    scope: "api",
    breaking: true,
    subject: "add search endpoint",
  });
});

Deno.test("parseHeader accepts hyphenated types", () => {
  const parsed = parseHeader("release-candidate(api): ship it");

  assertEquals(parsed?.type, "release-candidate");
  assertEquals(parsed?.scope, "api");
});

Deno.test("parseHeader returns undefined for invalid headers", () => {
  assertEquals(parseHeader("feat add search endpoint"), undefined);
});

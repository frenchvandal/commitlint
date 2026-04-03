import { assertEquals } from "@std/assert";

import { parseHeader } from "../mod.ts";

Deno.test("parseHeader extracts type, scope, and breaking marker", () => {
  const parsed = parseHeader("feat(api)!: add search endpoint");

  assertEquals(parsed, {
    type: "feat",
    scope: "api",
    scopes: ["api"],
    breaking: true,
    subject: "add search endpoint",
  });
});

Deno.test("parseHeader accepts hyphenated types", () => {
  const parsed = parseHeader("release-candidate(api): ship it");

  assertEquals(parsed?.type, "release-candidate");
  assertEquals(parsed?.scope, "api");
});

Deno.test("parseHeader accepts Unicode scopes and subjects", () => {
  const parsed = parseHeader("feat(解析): ajoute la recherche 🔎");

  assertEquals(parsed, {
    type: "feat",
    scope: "解析",
    scopes: ["解析"],
    breaking: false,
    subject: "ajoute la recherche 🔎",
  });
});

Deno.test("parseHeader splits multi-scope headers", () => {
  const parsed = parseHeader("feat(api, parser): add search endpoint");

  assertEquals(parsed?.scope, "api, parser");
  assertEquals(parsed?.scopes, ["api", "parser"]);
});

Deno.test("parseHeader returns undefined for invalid headers", () => {
  assertEquals(parseHeader("feat add search endpoint"), undefined);
});

Deno.test("parseHeader rejects empty scopes", () => {
  assertEquals(parseHeader("feat(): add search endpoint"), undefined);
});

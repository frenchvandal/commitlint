import { assertEquals } from "@std/assert";

import {
  BUILTIN_LINT_RULES,
  DEFAULT_COMMIT_TYPES,
  resolveLintRules,
} from "../mod.ts";

Deno.test("exports built-in lint rule metadata in stable order", () => {
  assertEquals(
    BUILTIN_LINT_RULES.map((rule) => rule.name),
    [
      "header-pattern",
      "header-trim",
      "type-enum",
      "type-case",
      "scope-enum",
      "scope-case",
      "scope-empty",
      "subject-case",
      "subject-full-stop",
      "header-max-length",
      "body-max-line-length",
      "footer-max-line-length",
      "body-leading-blank",
      "footer-leading-blank",
      "footer-token-enum",
      "footer-token-required",
      "breaking-change-description-required",
    ],
  );
  assertEquals(BUILTIN_LINT_RULES[0], {
    name: "header-pattern",
    description:
      'Header must match Conventional Commits format: "<type>[optional scope]: <description>".',
    configurable: false,
  });
  assertEquals(BUILTIN_LINT_RULES.at(-1), {
    name: "breaking-change-description-required",
    description:
      "Breaking changes must include a non-empty BREAKING CHANGE footer.",
    configurable: true,
  });
});

Deno.test("resolveLintRules exposes the default resolved preset", () => {
  const resolved = resolveLintRules();

  assertEquals(resolved.preset, "conventional-commits");
  assertEquals(
    resolved.rules.map((rule) => rule.name),
    BUILTIN_LINT_RULES.map((rule) => rule.name),
  );
  assertEquals(
    resolved.rules.find((rule) => rule.name === "header-pattern")?.level,
    "error",
  );
  assertEquals(
    resolved.rules.find((rule) => rule.name === "type-enum")?.level,
    "off",
  );
  assertEquals(
    resolved.rules.find((rule) => rule.name === "body-leading-blank")?.level,
    "error",
  );
});

Deno.test("resolveLintRules reflects preset defaults and typed overrides", () => {
  const resolved = resolveLintRules({
    preset: "commitlint",
    rules: {
      "scope-enum": {
        level: "warning",
        allowedScopes: ["api", "parser"],
      },
      "header-max-length": {
        max: 72,
      },
    },
  });

  assertEquals(resolved.preset, "commitlint");
  assertEquals(
    resolved.rules.find((rule) => rule.name === "type-enum")?.options,
    {
      allowedTypes: DEFAULT_COMMIT_TYPES.map((type) => type.name),
      suggest: true,
    },
  );
  assertEquals(
    resolved.rules.find((rule) => rule.name === "scope-enum"),
    {
      name: "scope-enum",
      description: "Scope must be one of the allowed values.",
      configurable: true,
      level: "warning",
      options: {
        allowedScopes: ["api", "parser"],
        suggest: true,
      },
    },
  );
  assertEquals(
    resolved.rules.find((rule) => rule.name === "header-max-length")?.options,
    { max: 72 },
  );
  assertEquals(
    resolved.rules.find((rule) => rule.name === "header-max-length")?.level,
    "error",
  );
});

Deno.test("resolveLintRules uses commitlint severity defaults for activated fallback rules", () => {
  const resolved = resolveLintRules({
    rules: {
      "header-max-length": {
        max: 72,
      },
      "scope-enum": {
        allowedScopes: ["api", "parser"],
      },
    },
  });

  assertEquals(
    resolved.rules.find((rule) => rule.name === "header-max-length")?.level,
    "error",
  );
  assertEquals(
    resolved.rules.find((rule) => rule.name === "scope-enum")?.level,
    "error",
  );
});

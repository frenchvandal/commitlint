import { assertEquals, assertStringIncludes } from "@std/assert";

import { lintCommit } from "../mod.ts";

Deno.test("accepts a valid commit header with the default preset", () => {
  const report = lintCommit("feat(parser): add array support");

  assertEquals(report.valid, true);
  assertEquals(report.errors, []);
  assertEquals(report.warnings, []);
  assertEquals(report.analysis?.summary?.type, "feat");
});

Deno.test("accepts custom types with the conventional-commits preset", () => {
  const report = lintCommit("release: ship it");

  assertEquals(report.valid, true);
  assertEquals(report.errors, []);
});

Deno.test("accepts upper-case types with the conventional-commits preset", () => {
  const report = lintCommit("Fix: add search support");

  assertEquals(report.valid, true);
  assertEquals(
    report.errors.some((issue) => issue.rule === "type-case"),
    false,
  );
});

Deno.test("accepts sentence-case subjects with the conventional-commits preset", () => {
  const report = lintCommit("fix: Add search support");

  assertEquals(report.valid, true);
  assertEquals(
    report.errors.some((issue) => issue.rule === "subject-case"),
    false,
  );
});

Deno.test("accepts subjects ending with a full stop with the conventional-commits preset", () => {
  const report = lintCommit("fix: add search support.");

  assertEquals(report.valid, true);
  assertEquals(
    report.errors.some((issue) => issue.rule === "subject-full-stop"),
    false,
  );
});

Deno.test("accepts long lines with the conventional-commits preset", () => {
  const report = lintCommit(
    `fix: ${"a".repeat(160)}\n\n${"b".repeat(140)}\n\nRefs: ${"c".repeat(120)}`,
  );

  assertEquals(report.valid, true);
  assertEquals(
    report.errors.some((issue) =>
      ["header-max-length", "body-max-line-length", "footer-max-line-length"]
        .includes(issue.rule)
    ),
    false,
  );
});

Deno.test("rejects malformed headers", () => {
  const report = lintCommit("fix add search support");

  assertEquals(
    report.errors.some((issue) => issue.rule === "header-pattern"),
    true,
  );
});

Deno.test("rejects empty input", () => {
  const report = lintCommit("");

  assertEquals(report.valid, false);
  assertEquals(
    report.errors.some((issue) => issue.rule === "header-pattern"),
    true,
  );
});

Deno.test("rejects inputs that only contain git comment lines", () => {
  const report = lintCommit(
    "# Please enter the commit message\n# on branch main",
  );

  assertEquals(report.input, "");
  assertEquals(report.valid, false);
  assertEquals(
    report.errors.some((issue) => issue.rule === "header-pattern"),
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

Deno.test("errors when the body is not separated by a blank line with the conventional-commits preset", () => {
  const report = lintCommit("fix: handle edge case\nBody text");

  assertEquals(report.valid, false);
  assertEquals(
    report.errors.some((issue) => issue.rule === "body-leading-blank"),
    true,
  );
  assertEquals(report.warnings, []);
});

Deno.test("errors when the footer is not separated by a blank line with the conventional-commits preset", () => {
  const report = lintCommit("fix: handle edge case\n\nBody text\nRefs: #123");

  assertEquals(report.valid, false);
  assertEquals(
    report.errors.some((issue) => issue.rule === "footer-leading-blank"),
    true,
  );
});

Deno.test("does not treat a footer as a body line when a blank line is present", () => {
  const report = lintCommit("fix: handle edge case\n\nRefs: #123");

  assertEquals(report.valid, true);
  assertEquals(report.errors, []);
  assertEquals(report.warnings, []);
});

Deno.test("strips git comment lines from the cleaned input", () => {
  const report = lintCommit("fix: handle edge case\n# Please enter a message");

  assertEquals(report.input.includes("# Please enter a message"), false);
});

Deno.test("rejects an unknown commit type with the commitlint preset", () => {
  const report = lintCommit("wip: ship it", { preset: "commitlint" });

  assertEquals(report.valid, false);
  assertEquals(report.errors.some((issue) => issue.rule === "type-enum"), true);
});

Deno.test("suggests the closest allowed type with the commitlint preset", () => {
  const report = lintCommit("feature: add search", { preset: "commitlint" });
  const issue = report.errors.find((candidate) =>
    candidate.rule === "type-enum"
  );

  assertStringIncludes(issue?.message ?? "", 'Did you mean "feat"?');
});

Deno.test("rejects disallowed subject case with the commitlint preset", () => {
  const report = lintCommit("fix: Add search support", {
    preset: "commitlint",
  });

  assertEquals(
    report.errors.some((issue) => issue.rule === "subject-case"),
    true,
  );
});

Deno.test("rejects types that are not lower-case with the commitlint preset", () => {
  const report = lintCommit("Fix: add search support", {
    preset: "commitlint",
  });

  assertEquals(
    report.errors.some((issue) => issue.rule === "type-case"),
    true,
  );
});

Deno.test("rejects headers longer than the configured limit with the commitlint preset", () => {
  const report = lintCommit(`fix: ${"a".repeat(96)}`, {
    preset: "commitlint",
  });

  assertEquals(
    report.errors.some((issue) => issue.rule === "header-max-length"),
    true,
  );
});

Deno.test("rejects subjects that end with a full stop with the commitlint preset", () => {
  const report = lintCommit("fix: add search support.", {
    preset: "commitlint",
  });

  assertEquals(
    report.errors.some((issue) => issue.rule === "subject-full-stop"),
    true,
  );
});

Deno.test("warns when the body is not separated by a blank line with the commitlint preset", () => {
  const report = lintCommit("fix: handle edge case\nBody text", {
    preset: "commitlint",
  });

  assertEquals(report.valid, true);
  assertEquals(
    report.warnings.some((issue) => issue.rule === "body-leading-blank"),
    true,
  );
});

Deno.test("warns when the footer is not separated by a blank line with the commitlint preset", () => {
  const report = lintCommit("fix: handle edge case\n\nBody text\nRefs: #123", {
    preset: "commitlint",
  });

  assertEquals(
    report.warnings.some((issue) => issue.rule === "footer-leading-blank"),
    true,
  );
});

Deno.test("treats a footer without a body as a footer when no blank line is present", () => {
  const report = lintCommit("fix: handle edge case\nBREAKING CHANGE: x", {
    preset: "commitlint",
  });

  assertEquals(report.errors, []);
  assertEquals(
    report.warnings.some((issue) => issue.rule === "footer-leading-blank"),
    true,
  );
  assertEquals(
    report.warnings.some((issue) => issue.rule === "body-leading-blank"),
    false,
  );
});

Deno.test("accepts git-style reference footers with the commitlint preset", () => {
  const report = lintCommit("fix: handle edge case\n\nRefs #123", {
    preset: "commitlint",
  });

  assertEquals(report.valid, true);
  assertEquals(report.errors, []);
  assertEquals(report.warnings, []);
});

Deno.test("handles Unicode subject casing with the commitlint preset", () => {
  const lowerCase = lintCommit("fix: évite la régression", {
    preset: "commitlint",
  });
  const upperCase = lintCommit("fix: Évite la régression", {
    preset: "commitlint",
  });

  assertEquals(
    lowerCase.errors.some((issue) => issue.rule === "subject-case"),
    false,
  );
  assertEquals(
    upperCase.errors.some((issue) => issue.rule === "subject-case"),
    true,
  );
});

Deno.test("checks body and footer line lengths separately with the commitlint preset", () => {
  const bodyReport = lintCommit(`fix: handle edge case\n\n${"a".repeat(101)}`, {
    preset: "commitlint",
  });
  const footerReport = lintCommit(
    `fix: handle edge case\n\nBREAKING CHANGE: ${"a".repeat(84)}`,
    { preset: "commitlint" },
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

Deno.test("supports typed rule overrides without leaving the conventional preset", () => {
  const report = lintCommit("release: ship it.", {
    rules: {
      "type-enum": {
        allowedTypes: ["feat", "fix"],
      },
      "subject-full-stop": {
        level: "warning",
      },
    },
  });

  assertEquals(report.errors.some((issue) => issue.rule === "type-enum"), true);
  assertEquals(
    report.warnings.some((issue) => issue.rule === "subject-full-stop"),
    true,
  );
});

Deno.test("can disable a built-in rule via typed overrides", () => {
  const report = lintCommit("fix: handle edge case\nBody text", {
    rules: {
      "body-leading-blank": {
        level: "off",
      },
    },
  });

  assertEquals(
    report.errors.some((issue) => issue.rule === "body-leading-blank"),
    false,
  );
  assertEquals(
    report.warnings.some((issue) => issue.rule === "body-leading-blank"),
    false,
  );
});

Deno.test("exposes structured issue locations", () => {
  const report = lintCommit(`fix: ${"a".repeat(101)}`, {
    rules: {
      "header-max-length": {
        max: 72,
      },
    },
  });
  const issue = report.errors.find((candidate) =>
    candidate.rule === "header-max-length"
  );

  assertEquals(issue?.location, {
    section: "header",
    line: 1,
    column: 73,
    length: 34,
  });
});

Deno.test("runs custom lint callbacks against the semantic analysis", () => {
  const report = lintCommit("feat: add search", {
    plugins: [
      (commit) => {
        if (commit.footers.some((footer) => footer.token === "Refs")) {
          return;
        }

        return {
          rule: "refs-required",
          severity: "warning",
          message: "Add a Refs footer.",
          location: {
            section: "footer",
            line: 1,
            column: 1,
          },
        };
      },
    ],
  });

  assertEquals(report.warnings, [{
    rule: "refs-required",
    severity: "warning",
    message: "Add a Refs footer.",
    location: {
      section: "footer",
      line: 1,
      column: 1,
    },
  }]);
});

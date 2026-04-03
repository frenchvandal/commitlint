# @miscellaneous/commitlint

Cross-runtime Conventional Commits parser and linter for Deno, Node.js, Bun, and
Cloudflare Workers.

## Features

- Compatible with Deno, Node, Bun, and Cloudflare Workers.
- Keeps a zero-dependency, 100% TypeScript runtime surface.
- Parses commit messages into a syntax tree with source positions.
- Analyzes commit messages into semantic sections without throwing.
- Parses and validates comma-delimited multi-scope headers such as
  `feat(api,parser): ...`.
- Lints commit headers directly for PR title and squash-title workflows.
- Lints batches of commit messages without depending on Git or a runtime.
- Defaults to the core Conventional Commits specification.
- Provides an optional `commitlint` preset that mirrors
  `@commitlint/config-conventional`.
- Supports typed rule overrides for scopes and footer tokens.
- Exposes structured suggestions and machine-applicable edits in lint issues.
- Supports token-specific footer schemas for required trailers and value
  formats.
- Supports opt-in ignore policies for workflow commits such as `fixup!`.
- Provides best-effort commit normalization for editor and automation flows.
- Exports built-in commit type metadata for editor and UI integrations.
- Exposes built-in lint rule metadata and resolved preset configs.
- Supports custom lint callbacks with no runtime dependencies.
- Publishes a library-only surface to JSR.

## Install

### Deno

```sh
deno add jsr:@miscellaneous/commitlint
```

### Node.js / Bun

```sh
npx jsr add @miscellaneous/commitlint
```

## Usage

```ts
import {
  analyzeCommit,
  BUILTIN_LINT_RULES,
  DEFAULT_COMMIT_TYPES,
  formatBatchReport,
  formatReport,
  lintCommit,
  lintCommits,
  lintHeader,
  normalizeCommit,
  parseCommit,
  parseHeader,
  resolveLintRules,
} from "jsr:@miscellaneous/commitlint";

const report = lintCommit("feat: add search");
const titleReport = lintHeader("feat(api): add search");
const batch = lintCommits(["feat: add search", "wip: ship it"], {
  preset: "commitlint",
});
const normalized = normalizeCommit(" Fix(API, Parser): Add search. ");
const tree = parseCommit("feat(api): add search");
const commit = analyzeCommit("feat(api)!: add search\n\nRefs: #123");
const header = parseHeader("feat(api): add search");
const rules = resolveLintRules({ preset: "commitlint" });

console.log(report.valid); // true
console.log(titleReport.valid); // true
console.log(batch.invalidCount); // 1
console.log(formatReport(report));
console.log(formatBatchReport(batch));
console.log(normalized); // “fix(api,parser): Add search”
console.log(tree.children[0]?.type); // “summary”
console.log(commit.footers[0]?.token); // “Refs”
console.log(header?.scopes); // [“api”]
console.log(DEFAULT_COMMIT_TYPES.find((type) => type.name === "feat")?.name);
// “feat”
console.log(BUILTIN_LINT_RULES[0]?.name); // “header-pattern”
console.log(rules.rules.find((rule) => rule.name === "type-enum")?.level);
// “error”
```

Use typed rule overrides on top of a preset:

```ts
import { lintCommit } from "jsr:@miscellaneous/commitlint";

const report = lintCommit("feature(ui): add search.", {
  preset: "conventional-commits",
  rules: {
    "scope-enum": {
      allowedScopes: ["api", "parser"],
    },
    "footer-token-required": {
      tokens: ["Refs"],
    },
  },
});

console.log(report.valid); // false
console.log(report.errors[0]?.rule); // “scope-enum”
console.log(report.errors[1]?.rule); // “footer-token-required”
```

Add a custom lint callback with no runtime dependencies:

```ts
import { lintCommit } from "jsr:@miscellaneous/commitlint";

const report = lintCommit("feat: add search", {
  plugins: [
    (commit) => {
      if (commit.footers.some((footer) => footer.token === "Refs")) {
        return;
      }

      return {
        rule: "refs-required",
        severity: "warning",
        message: "Add a Refs footer when the change should be tracked.",
      };
    },
  ],
});

console.log(report.warnings[0]?.rule); // “refs-required”
```

Ignore workflow commits without changing your lint rules:

```ts
import { lintCommit } from "jsr:@miscellaneous/commitlint";

const report = lintCommit("fixup! feat: add search", {
  defaultIgnores: true,
});

console.log(report.ignored); // true
console.log(report.valid); // true
```

Lint only the header line when you are validating pull request titles:

```ts
import { lintHeader } from "jsr:@miscellaneous/commitlint";

const report = lintHeader("feat(api): add search.", {
  preset: "commitlint",
});

console.log(report.valid); // false
console.log(report.errors[0]?.rule); // “subject-full-stop”
```

Lint multiple commit messages in one pass:

```ts
import { lintCommits } from "jsr:@miscellaneous/commitlint";

const batch = lintCommits([
  "feat(api): add search",
  "fixup! feat(api): add search",
  "wip: ship it",
], {
  preset: "commitlint",
  defaultIgnores: true,
});

console.log(batch.totalCount); // 3
console.log(batch.ignoredCount); // 1
console.log(batch.invalidCount); // 1
```

Validate multi-scope headers and consume structured suggestions:

```ts
import { lintCommit } from "jsr:@miscellaneous/commitlint";

const report = lintCommit("feature(API, docs): Add search.", {
  preset: "commitlint",
  rules: {
    "scope-enum": {
      allowedScopes: ["api", "parser"],
    },
  },
});

console.log(report.analysis?.summary?.scopes); // [“API”, “docs”]
console.log(report.errors[0]?.suggestions?.[0]?.edit?.replacement); // “feat”
console.log(report.errors[1]?.suggestions?.[0]?.edit?.replacement); // “api”
```

Apply footer-schema validation for trailers:

```ts
import { lintCommit } from "jsr:@miscellaneous/commitlint";

const report = lintCommit("feat: add search\n\nRefs: abc", {
  footerSchema: [{
    token: "Refs",
    required: true,
    requireValue: true,
    valuePattern: /^#\\d+$/u,
    valueDescription: '"#<number>"',
  }],
});

console.log(report.valid); // false
console.log(report.errors[0]?.rule); // “footer-schema”
```

Inspect the effective built-in rules for a preset:

```ts
import { resolveLintRules } from "jsr:@miscellaneous/commitlint";

const resolved = resolveLintRules({
  preset: "commitlint",
  rules: {
    "scope-enum": {
      level: "warning",
      allowedScopes: ["api", "parser"],
    },
  },
});

console.log(resolved.preset); // “commitlint”
console.log(resolved.rules.find((rule) => rule.name === "scope-enum")?.level);
// “warning”
```

Parse a message without applying lint rules:

```ts
import { parseCommit } from "jsr:@miscellaneous/commitlint";

const tree = parseCommit(
  "feat(parser)!: add support for scopes\n\nBREAKING CHANGE: API changed",
);

console.log(tree.type); // “message”
console.log(tree.children.map((node) => node.type));
// [“summary”, “newline”, “footer”]
```

`parseCommit()` is structural and throws on syntax errors. `analyzeCommit()` is
semantic and best-effort. `lintCommit()` is policy-oriented and returns a report
instead of throwing, so it remains the right entrypoint when you need
validation.

Footer tokens accept either `:` or the git-style `space + #` separator, so both
`Refs: #123` and `Refs #123` are recognized.

`LintIssue.suggestions` may include machine-applicable edits for callers that
want to build editor actions, autofix previews, or bot comments.

When you configure `footer-token-enum`, include any breaking-change tokens you
want to allow explicitly, such as `BREAKING CHANGE` or `BREAKING-CHANGE`.

## API

### `lintCommit(input: string, options?: LintOptions): LintReport`

Validate a commit message and return a structured lint report.

Available presets:

- `conventional-commits` (default): validates the generic Conventional Commits
  structure.
- `commitlint`: mirrors the default rules from
  `@commitlint/config-conventional`.

`LintOptions` also supports:

- `rules`: typed overrides for built-in rules, merged on top of the selected
  preset. When an override enables a rule that is inactive in the selected
  preset and omits `level`, the rule falls back to the default severity used by
  the `commitlint` preset.
- `defaultIgnores`: opt-in built-in ignore predicates for workflow commits such
  as `fixup!`, `squash!`, merge commits, and revert commits.
- `ignores`: custom predicates that can short-circuit linting for matching
  messages.
- `plugins`: pure TypeScript callbacks that can emit additional issues.
- `footerSchema`: token-specific trailer validation for required footers,
  duplicate prevention, non-empty values, and value patterns.
- `helpUrl`: an optional documentation URL copied into reports and formatted
  output.
- `scopeDelimiters`: optional delimiters used to split multi-scope headers. The
  default is `[,]`.

When a message matches an ignore predicate, `LintReport.ignored` is `true` and
the report is returned as valid without running rules or plugins.

### `lintHeader(input: string, options?: LintOptions): LintReport`

Validate only the first line of a Conventional Commit. This is useful for pull
request titles, squash-merge titles, or editor flows that work with commit
headers only. Any additional lines in the provided input are ignored.

### `lintCommits(inputs: ReadonlyArray<string>, options?: LintOptions): LintBatchReport`

Validate multiple commit messages and return aggregate counts plus the
per-message reports. This keeps the library runtime-agnostic by leaving Git
history access to wrappers and caller code.

### `formatReport(report: LintReport, options?: { color?: boolean }): string`

Format a lint report for terminal output.

### `formatBatchReport(report: LintBatchReport, options?: { color?: boolean }): string`

Format a batch lint report for terminal output.

### `analyzeCommit(input: string, options?: AnalyzeOptions): CommitAnalysis`

Analyze a commit message into semantic sections without applying lint rules.

### `DEFAULT_COMMIT_TYPES: ReadonlyArray<CommitTypeDefinition>`

Expose the built-in commit type catalog mirrored from
`@commitlint/config-conventional`, with descriptions suitable for editor and UI
integrations.

### `BUILTIN_LINT_RULES: ReadonlyArray<LintBuiltinRuleDefinition>`

Expose metadata for the built-in lint rules, including their stable names,
descriptions, and whether they are configurable through `LintOptions.rules`.

### `resolveLintRules(options?: LintOptions): ResolvedLintConfig`

Resolve the effective built-in lint rules for a preset and override set. This is
useful for wrappers, UIs, and tests that need to inspect the final built-in rule
configuration before linting.

### `normalizeCommit(input: string, options?: NormalizeOptions): string`

Normalize a commit message without applying lint rules.

### `parseHeader(input: string, options?: ParseHeaderOptions): ParsedHeader | undefined`

Parse only the commit header into its semantic fields, including `scopes` for
multi-scope headers.

### `parseCommit(input: string): CommitMessage`

Parse a commit message into a unist-compatible syntax tree with source
locations. The returned tree uses the node types `message`, `summary`, `body`,
`footer`, `token`, `value`, `continuation`, `type`, `scope`, `breaking-change`,
`separator`, `whitespace`, `text`, and `newline`.

## Cloudflare Workers example

The Worker example accepts a commit message in the request body and returns the
lint report as JSON. Cloudflare’s current Wrangler configuration expects, at a
minimum, a Worker name, an entrypoint, and a `compatibility_date`.

```jsonc
{
  "name": "commitlint-worker",
  "main": "examples/worker.ts",
  "compatibility_date": "2026-03-29"
}
```

See `examples/worker.ts`.

## Trust

This package is published from GitHub Actions using JSR trusted publishing.
According to JSR’s trust model, packages published from GitHub Actions with the
native `jsr publish` or `deno publish` integration automatically receive a JSR
provenance statement in the public transparency log. The publish workflow in
this repository also generates a GitHub artifact attestation for the published
source bundle.

## License

MIT

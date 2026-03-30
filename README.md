# @miscellaneous/commitlint

Cross-runtime Conventional Commits parser and linter for Deno, Node.js, Bun, and
Cloudflare Workers.

## Features

- Compatible with Deno, Node, Bun, and Cloudflare Workers.
- Keeps a zero-dependency, 100% TypeScript runtime surface.
- Parses commit messages into a syntax tree with source positions.
- Analyzes commit messages into semantic sections without throwing.
- Defaults to the core Conventional Commits specification.
- Provides an optional `commitlint` preset that mirrors
  `@commitlint/config-conventional`.
- Supports typed rule overrides for scopes and footer tokens.
- Supports opt-in ignore policies for workflow commits such as `fixup!`.
- Exports built-in commit type metadata for editor and UI integrations.
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
  DEFAULT_COMMIT_TYPES,
  formatReport,
  lintCommit,
  parseCommit,
  parseHeader,
} from "jsr:@miscellaneous/commitlint";

const report = lintCommit("feat: add search");
const tree = parseCommit("feat(api): add search");
const commit = analyzeCommit("feat(api)!: add search\n\nRefs: #123");
const header = parseHeader("feat(api): add search");

console.log(report.valid); // true
console.log(formatReport(report));
console.log(tree.children[0]?.type); // "summary"
console.log(commit.footers[0]?.token); // "Refs"
console.log(header?.scope); // "api"
console.log(DEFAULT_COMMIT_TYPES[4]?.name); // "feat"
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
console.log(report.errors[0]?.rule); // "scope-enum"
console.log(report.errors[1]?.rule); // "footer-token-required"
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

console.log(report.warnings[0]?.rule); // "refs-required"
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

Parse a message without applying lint rules:

```ts
import { parseCommit } from "jsr:@miscellaneous/commitlint";

const tree = parseCommit(
  "feat(parser)!: add support for scopes\n\nBREAKING CHANGE: API changed",
);

console.log(tree.type); // "message"
console.log(tree.children.map((node) => node.type));
// ["summary", "newline", "footer"]
```

`parseCommit()` is structural and throws on syntax errors. `analyzeCommit()` is
semantic and best-effort. `lintCommit()` is policy-oriented and returns a report
instead of throwing, so it remains the right entrypoint when you need
validation.

Footer tokens accept either `:` or the git-style `space + #` separator, so both
`Refs: #123` and `Refs #123` are recognized.

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
  preset.
- `defaultIgnores`: opt-in built-in ignore predicates for workflow commits such
  as `fixup!`, `squash!`, merge commits, and revert commits.
- `ignores`: custom predicates that can short-circuit linting for matching
  messages.
- `plugins`: pure TypeScript callbacks that can emit additional issues.

When a message matches an ignore predicate, `LintReport.ignored` is `true` and
the report is returned as valid without running rules or plugins.

### `formatReport(report: LintReport, options?: { color?: boolean }): string`

Format a lint report for terminal output.

### `analyzeCommit(input: string): CommitAnalysis`

Analyze a commit message into semantic sections without applying lint rules.

### `DEFAULT_COMMIT_TYPES: ReadonlyArray<CommitTypeDefinition>`

Expose the built-in commit type catalog mirrored from
`@commitlint/config-conventional`, with descriptions suitable for editor and UI
integrations.

### `parseHeader(input: string): ParsedHeader | undefined`

Parse only the commit header into its semantic fields.

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

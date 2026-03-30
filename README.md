# @miscellaneous/commitlint

Cross-runtime Conventional Commits parser and linter for Deno, Node.js, Bun, and
Cloudflare Workers.

## Features

- Compatible with Deno, Node, Bun, and Cloudflare Workers.
- Parses commit messages into a syntax tree with source positions.
- Defaults to the core Conventional Commits specification.
- Provides an optional `commitlint` preset that mirrors
  `@commitlint/config-conventional`.
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
  formatReport,
  lintCommit,
  parseCommit,
} from "jsr:@miscellaneous/commitlint";

const report = lintCommit("feat: add search");
const tree = parseCommit("feat(api): add search");

console.log(report.valid); // true
console.log(formatReport(report));
console.log(tree.children[0]?.type); // "summary"
```

Use a non-default preset:

```ts
import { lintCommit } from "jsr:@miscellaneous/commitlint";

const report = lintCommit("feature: add search", {
  preset: "commitlint",
});

console.log(report.valid); // false
console.log(report.errors[0]?.rule); // "type-enum"
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

`parseCommit()` is structural and throws on syntax errors. `lintCommit()` is
policy-oriented and returns a report instead of throwing, so it remains the
right entrypoint when you need validation.

## API

### `lintCommit(input: string, options?: { preset?: "conventional-commits" | "commitlint" }): LintReport`

Validate a commit message and return a structured lint report.

Available presets:

- `conventional-commits` (default): validates the generic Conventional Commits
  structure.
- `commitlint`: mirrors the default rules from
  `@commitlint/config-conventional`.

### `formatReport(report: LintReport, options?: { color?: boolean }): string`

Format a lint report for terminal output.

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

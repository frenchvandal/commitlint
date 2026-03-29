# @miscellaneous/commitlint

Cross-runtime Conventional Commits linter for Deno, Node.js, Bun, and Cloudflare
Workers.

## Features

- Compatible with Deno, Node, Bun, and Cloudflare Workers.
- Mirrors the default rules from `@commitlint/config-conventional`.
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
import { formatReport, lintCommit } from "jsr:@miscellaneous/commitlint";

const report = lintCommit("feat: add search");

console.log(report.valid); // true
console.log(formatReport(report));
```

## API

### `lintCommit(input: string): LintReport`

Validate a commit message and return a structured lint report.

### `formatReport(report: LintReport, options?: { color?: boolean }): string`

Format a lint report for terminal output.

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

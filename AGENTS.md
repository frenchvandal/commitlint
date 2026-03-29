# @miscellaneous/commitlint

Cross-runtime Conventional Commits linter for Deno, Node.js, Bun, and Cloudflare
Workers.

## Mission

This repository publishes a small library to JSR. The published surface must
stay focused, well-documented, and runtime-agnostic.

## Canonical References

- Conventional Commits 1.0.0:
  `https://www.conventionalcommits.org/en/v1.0.0/#specification`
- `commitlint` and `@commitlint/config-conventional`:
  `https://github.com/conventional-changelog/commitlint`
- JSR documentation: `https://jsr.io/docs/introduction`

The library should follow the Conventional Commits specification for structure
and mirror `@commitlint/config-conventional` for the default lint rules applied
by this package.

## Published Surface

The published JSR package is the library only.

- `mod.ts` is the single public entrypoint.
- `examples/` is documentation and should not become part of the public API.
- Internal modules under `src/` may change freely unless re-exported from
  `mod.ts`.

Keep the public API small. If a symbol does not clearly improve the library API,
do not export it.

## Runtime Policy

The library must remain compatible with:

- Deno
- Node.js
- Bun
- Cloudflare Workers

Prefer web-standard APIs and portable TypeScript. Avoid runtime-specific code in
the published library. If runtime-specific behavior is necessary, isolate it to
examples or non-published tooling.

## Configuration Policy

Repository metadata must stay aligned across configuration files.

- `deno.json` is the source of truth for JSR publication metadata.
- Tooling files such as `.tool-versions`, `.gitignore`, and any local runtime
  configuration should stay minimal and accurate.

If metadata changes in one config file, update the corresponding values
everywhere else in the same change.

## Documentation Policy

All documentation for this project must be written in English and follow a
clear, neutral, and concise style consistent with the Chicago Manual of Style,
17th edition.

Public exports should have useful JSDoc comments so the generated JSR
documentation remains strong. Do not claim support, compatibility, or behavior
that has not been verified.

## Code Style

Use modern TypeScript and JavaScript. Favor small, readable functions, simple
control flow, and explicit names. Less is more: avoid duplication, incidental
complexity, and verbose abstractions.

## Working Norms

All changes must be tested: if you have not tested your changes, you are not
done.

Be humble and honest: **NEVER** overstate what you have accomplished or what
actually works in commits, pull requests, or messages to the user.

Do not be lazy: never ask the human user to do something you can reasonably
handle by yourself.

## Verification

All changes must be tested. A change is not complete until the relevant checks
have been run successfully.

Minimum verification for a release-ready change:

- `deno task check`
- `deno publish --dry-run --allow-dirty`

If behavior changes, add or update tests rather than relying on manual
inspection alone.

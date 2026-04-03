# Changelog

All notable changes to this project will be documented in this file.

## 0.3.2 - 2026-04-03

### Added

- Added multi-scope header parsing and validation, including
  `ParsedHeader.scopes` and configurable scope delimiters.
- Added structured lint suggestions with machine-applicable edits for editor,
  UI, and bot integrations.
- Added footer schema validation for required trailers, duplicate control, and
  token-specific value patterns.
- Added `normalizeCommit()` for best-effort commit normalization.
- Added `formatBatchReport()` for terminal-friendly batch summaries.

### Changed

- Expanded lint reports with optional `helpUrl` metadata for policy guidance.
- Added built-in `type-empty` and `subject-empty` rules.
- Updated the README and examples to cover multi-scope parsing, footer schemas,
  normalization, and batch formatting.

## 0.3.1 - 2026-03-31

### Added

- Added built-in lint rule metadata via `BUILTIN_LINT_RULES`.
- Added `resolveLintRules()` to inspect the effective preset and overrides.
- Added typed rule-resolution metadata for wrappers, tests, and UI tooling.

### Changed

- Improved lint helper ergonomics around preset and rule introspection.
- Added the runtime update workflow used to keep supported runtimes current.

## 0.3.0 - 2026-03-30

### Added

- Expanded the built-in lint rules and rule metadata.
- Added `DEFAULT_COMMIT_TYPES` for editor, UI, and changelog integrations.
- Improved footer parsing and footer-related lint coverage.

### Changed

- Tightened compatibility with the `commitlint` conventional preset.
- Expanded formatter and lint test coverage for the published API.

## 0.2.0 - 2026-03-30

### Added

- Added semantic commit analysis via `analyzeCommit()`.
- Added batch linting and aggregate report metadata via `lintCommits()`.
- Added richer lint report types, formatted output helpers, and footer parsing
  support.

### Changed

- Expanded the lint API and type surface for callers integrating the library
  into automation and tooling.

## 0.1.4 - 2026-03-30

### Changed

- Hardened parser behavior and expanded parser and lint coverage for edge cases.
- Refined release metadata and documentation around the structured parser.

## 0.1.3 - 2026-03-30

### Added

- Added a structured Conventional Commits parser with AST node positions.
- Added public parser node types and parser-focused test coverage.

## 0.1.2 - 2026-03-29

### Changed

- Refined formatter output and lint edge-case handling.
- Updated release metadata for the published package.

## 0.1.1 - 2026-03-29

### Added

- Added built-in lint presets and a publish version gate.
- Added CI, compatibility, and publish workflows for release validation.

## 0.1.0 - 2026-03-29

### Added

- Initial JSR release of the cross-runtime Conventional Commits linter.
- Added the core linting primitives for Deno, Node.js, Bun, and Cloudflare
  Workers.

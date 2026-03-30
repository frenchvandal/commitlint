/**
 * Built-in commit type metadata used by the lint presets and public API.
 *
 * @module
 */

import type { CommitTypeDefinition } from "./types.ts";

/** Default commit types mirrored from `@commitlint/config-conventional`. */
export const DEFAULT_COMMIT_TYPES: ReadonlyArray<CommitTypeDefinition> = [
  {
    name: "build",
    description:
      "Changes that affect the build system or external dependencies.",
    title: "Builds",
  },
  {
    name: "chore",
    description: "Other changes that do not modify source or test files.",
    title: "Chores",
  },
  {
    name: "ci",
    description: "Changes to CI configuration files and scripts.",
    title: "Continuous Integration",
  },
  {
    name: "docs",
    description: "Documentation-only changes.",
    title: "Documentation",
  },
  {
    name: "feat",
    description: "A new feature.",
    title: "Features",
  },
  {
    name: "fix",
    description: "A bug fix.",
    title: "Bug Fixes",
  },
  {
    name: "perf",
    description: "A code change that improves performance.",
    title: "Performance Improvements",
  },
  {
    name: "refactor",
    description: "A code change that neither fixes a bug nor adds a feature.",
    title: "Code Refactoring",
  },
  {
    name: "revert",
    description: "A commit that reverts a previous change.",
    title: "Reverts",
  },
  {
    name: "style",
    description: "Changes that do not affect the meaning of the code.",
    title: "Styles",
  },
  {
    name: "test",
    description: "Adding missing tests or correcting existing tests.",
    title: "Tests",
  },
] as const;

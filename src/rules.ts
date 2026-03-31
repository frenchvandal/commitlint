/**
 * Built-in lint-rule metadata and preset resolution helpers.
 *
 * @module
 */

import { DEFAULT_LINT_PRESET } from "./presets.ts";
import { resolveLintConfig } from "./_internal/lint_config.ts";
import type {
  LintBuiltinRuleDefinition,
  LintBuiltinRuleName,
  LintOptions,
  LintRuleLevel,
  ResolvedLintConfig,
  ResolvedLintRule,
} from "./types.ts";

/** Public metadata for the built-in lint rules evaluated by {@link lintCommit}. */
export const BUILTIN_LINT_RULES: ReadonlyArray<LintBuiltinRuleDefinition> = [
  {
    name: "header-pattern",
    description:
      'Header must match Conventional Commits format: "<type>[optional scope]: <description>".',
    configurable: false,
  },
  {
    name: "header-trim",
    description: "Header must not have leading or trailing whitespace.",
    configurable: false,
  },
  {
    name: "type-enum",
    description: "Type must be one of the allowed values.",
    configurable: true,
  },
  {
    name: "type-case",
    description: "Type must be lower-case.",
    configurable: true,
  },
  {
    name: "scope-enum",
    description: "Scope must be one of the allowed values.",
    configurable: true,
  },
  {
    name: "scope-case",
    description: "Scope must be lower-case.",
    configurable: true,
  },
  {
    name: "scope-empty",
    description: "Scope is required.",
    configurable: true,
  },
  {
    name: "subject-case",
    description: "Subject must not use a disallowed case.",
    configurable: true,
  },
  {
    name: "subject-full-stop",
    description: "Subject must not end with a full stop.",
    configurable: true,
  },
  {
    name: "header-max-length",
    description: "Header must not exceed the configured length.",
    configurable: true,
  },
  {
    name: "body-max-line-length",
    description: "Body lines must not exceed the configured length.",
    configurable: true,
  },
  {
    name: "footer-max-line-length",
    description: "Footer lines must not exceed the configured length.",
    configurable: true,
  },
  {
    name: "body-leading-blank",
    description: "Body must be separated from the header by a blank line.",
    configurable: true,
  },
  {
    name: "footer-leading-blank",
    description:
      "Footer must be separated from the preceding section by a blank line.",
    configurable: true,
  },
  {
    name: "footer-token-enum",
    description: "Footer tokens must be one of the allowed values.",
    configurable: true,
  },
  {
    name: "footer-token-required",
    description: "At least one required footer token must be present.",
    configurable: true,
  },
  {
    name: "breaking-change-description-required",
    description:
      "Breaking changes must include a non-empty BREAKING CHANGE footer.",
    configurable: true,
  },
];

const BUILTIN_LINT_RULES_BY_NAME = new Map<
  LintBuiltinRuleName,
  LintBuiltinRuleDefinition
>(
  BUILTIN_LINT_RULES.map((definition) =>
    [definition.name, definition] as const
  ),
);

function resolvedRule(
  definition: LintBuiltinRuleDefinition,
  level: LintRuleLevel,
  options?: ResolvedLintRule["options"],
): ResolvedLintRule {
  return options === undefined
    ? {
      ...definition,
      level,
    }
    : {
      ...definition,
      level,
      options,
    };
}

function builtinRule(name: LintBuiltinRuleName): LintBuiltinRuleDefinition {
  const definition = BUILTIN_LINT_RULES_BY_NAME.get(name);

  if (definition === undefined) {
    throw new TypeError(
      `Missing built-in lint rule definition for "${name}".`,
    );
  }

  return definition;
}

/**
 * Resolve the effective built-in lint rules for a preset and override set.
 *
 * This is useful for wrappers that need to inspect the selected defaults,
 * reflect them in a UI, or snapshot the final built-in configuration before
 * running {@link lintCommit}.
 *
 * @param options Optional lint settings merged on top of the selected preset.
 * @returns The effective built-in rule set in stable evaluation order.
 *
 * @example
 * ```ts
 * import { resolveLintRules } from "@miscellaneous/commitlint";
 *
 * const resolved = resolveLintRules({
 *   preset: "commitlint",
 *   rules: {
 *     "scope-enum": {
 *       level: "warning",
 *       allowedScopes: ["api", "parser"],
 *     },
 *   },
 * });
 *
 * console.log(resolved.preset); // "commitlint"
 * console.log(resolved.rules.find((rule) => rule.name === "scope-enum")?.level);
 * // "warning"
 * ```
 */
export function resolveLintRules(
  options: LintOptions = {},
): ResolvedLintConfig {
  const preset = options.preset ?? DEFAULT_LINT_PRESET;
  const rules = resolveLintConfig(options);

  return {
    preset,
    rules: [
      resolvedRule(builtinRule("header-pattern"), "error"),
      resolvedRule(builtinRule("header-trim"), "error"),
      resolvedRule(
        builtinRule("type-enum"),
        rules.typeEnum?.severity ?? "off",
        rules.typeEnum === undefined ? undefined : {
          allowedTypes: [...rules.typeEnum.allowed],
          suggest: rules.typeEnum.suggest,
        },
      ),
      resolvedRule(builtinRule("type-case"), rules.typeCase?.severity ?? "off"),
      resolvedRule(
        builtinRule("scope-enum"),
        rules.scopeEnum?.severity ?? "off",
        rules.scopeEnum === undefined ? undefined : {
          allowedScopes: [...rules.scopeEnum.allowed],
          suggest: rules.scopeEnum.suggest,
        },
      ),
      resolvedRule(
        builtinRule("scope-case"),
        rules.scopeCase?.severity ?? "off",
      ),
      resolvedRule(
        builtinRule("scope-empty"),
        rules.scopeEmpty?.severity ?? "off",
      ),
      resolvedRule(
        builtinRule("subject-case"),
        rules.subjectCase?.severity ?? "off",
      ),
      resolvedRule(
        builtinRule("subject-full-stop"),
        rules.subjectFullStop?.severity ?? "off",
      ),
      resolvedRule(
        builtinRule("header-max-length"),
        rules.headerMaxLength?.severity ?? "off",
        rules.headerMaxLength === undefined
          ? undefined
          : { max: rules.headerMaxLength.max },
      ),
      resolvedRule(
        builtinRule("body-max-line-length"),
        rules.bodyMaxLineLength?.severity ?? "off",
        rules.bodyMaxLineLength === undefined
          ? undefined
          : { max: rules.bodyMaxLineLength.max },
      ),
      resolvedRule(
        builtinRule("footer-max-line-length"),
        rules.footerMaxLineLength?.severity ?? "off",
        rules.footerMaxLineLength === undefined
          ? undefined
          : { max: rules.footerMaxLineLength.max },
      ),
      resolvedRule(
        builtinRule("body-leading-blank"),
        rules.bodyLeadingBlank?.severity ?? "off",
      ),
      resolvedRule(
        builtinRule("footer-leading-blank"),
        rules.footerLeadingBlank?.severity ?? "off",
      ),
      resolvedRule(
        builtinRule("footer-token-enum"),
        rules.footerTokenEnum?.severity ?? "off",
        rules.footerTokenEnum === undefined ? undefined : {
          allowedTokens: [...rules.footerTokenEnum.allowed],
          suggest: rules.footerTokenEnum.suggest,
        },
      ),
      resolvedRule(
        builtinRule("footer-token-required"),
        rules.footerTokenRequired?.severity ?? "off",
        rules.footerTokenRequired === undefined
          ? undefined
          : { tokens: [...rules.footerTokenRequired.tokens] },
      ),
      resolvedRule(
        builtinRule("breaking-change-description-required"),
        rules.breakingChangeDescriptionRequired?.severity ?? "off",
      ),
    ],
  };
}

/**
 * Internal lint-preset resolution helpers.
 *
 * @module
 */

import {
  DEFAULT_LINT_PRESET,
  LINT_PRESET_CONFIGS,
  type LintPresetConfig,
} from "../presets.ts";
import type { LintOptions, LintPreset, Severity } from "../types.ts";

function getLintPresetConfig(preset: LintPreset) {
  return LINT_PRESET_CONFIGS[preset];
}

function mergeSeverityRule(
  base: { readonly severity: Severity } | undefined,
  override: { readonly level?: Severity | "off" } | undefined,
  fallback: { readonly severity: Severity } | undefined,
) {
  if (override === undefined) return base;
  if (override.level === "off") return undefined;

  const template = base ?? fallback;
  if (template === undefined) {
    return override.level === undefined
      ? undefined
      : { severity: override.level };
  }

  return {
    severity: override.level ?? template.severity,
  };
}

function mergeMaxLengthRule(
  base: { readonly severity: Severity; readonly max: number } | undefined,
  override:
    | { readonly level?: Severity | "off"; readonly max?: number }
    | undefined,
  fallback: { readonly severity: Severity; readonly max: number } | undefined,
) {
  if (override === undefined) return base;
  if (override.level === "off") return undefined;

  const template = base ?? fallback;
  if (template === undefined) {
    if (override.max === undefined) return undefined;

    return {
      severity: override.level ?? "error",
      max: override.max,
    };
  }

  return {
    severity: override.level ?? template.severity,
    max: override.max ?? template.max,
  };
}

function mergeEnumRule(
  base:
    | {
      readonly severity: Severity;
      readonly allowed: ReadonlyArray<string>;
      readonly suggest: boolean;
    }
    | undefined,
  override:
    | {
      readonly level?: Severity | "off";
      readonly allowed?: ReadonlyArray<string>;
      readonly suggest?: boolean;
    }
    | undefined,
  fallback:
    | {
      readonly severity: Severity;
      readonly allowed: ReadonlyArray<string>;
      readonly suggest: boolean;
    }
    | undefined,
) {
  if (override === undefined) return base;
  if (override.level === "off") return undefined;

  const template = base ?? fallback;
  if (template === undefined) {
    if (override.allowed === undefined) return undefined;

    return {
      severity: override.level ?? "error",
      allowed: override.allowed,
      suggest: override.suggest ?? true,
    };
  }

  return {
    severity: override.level ?? template.severity,
    allowed: override.allowed ?? template.allowed,
    suggest: override.suggest ?? template.suggest,
  };
}

function mergeRequiredTokensRule(
  base:
    | { readonly severity: Severity; readonly tokens: ReadonlyArray<string> }
    | undefined,
  override:
    | {
      readonly level?: Severity | "off";
      readonly tokens?: ReadonlyArray<string>;
    }
    | undefined,
  fallback:
    | { readonly severity: Severity; readonly tokens: ReadonlyArray<string> }
    | undefined,
) {
  if (override === undefined) return base;
  if (override.level === "off") return undefined;

  const template = base ?? fallback;
  if (template === undefined) {
    if (override.tokens === undefined) return undefined;

    return {
      severity: override.level ?? "error",
      tokens: override.tokens,
    };
  }

  return {
    severity: override.level ?? template.severity,
    tokens: override.tokens ?? template.tokens,
  };
}

export function resolveLintConfig(options: LintOptions): LintPresetConfig {
  const preset = options.preset ?? DEFAULT_LINT_PRESET;
  const base = getLintPresetConfig(preset);
  const fallback = LINT_PRESET_CONFIGS["commitlint"];
  const rules = options.rules;

  if (rules === undefined) return base;

  return {
    typeEmpty: mergeSeverityRule(
      base.typeEmpty,
      rules["type-empty"],
      fallback.typeEmpty,
    ),
    typeEnum: mergeEnumRule(
      base.typeEnum,
      rules["type-enum"] === undefined ? undefined : {
        level: rules["type-enum"].level,
        allowed: rules["type-enum"].allowedTypes,
        suggest: rules["type-enum"].suggest,
      },
      fallback.typeEnum,
    ),
    typeCase: mergeSeverityRule(
      base.typeCase,
      rules["type-case"],
      fallback.typeCase,
    ),
    scopeEnum: mergeEnumRule(
      base.scopeEnum,
      rules["scope-enum"] === undefined ? undefined : {
        level: rules["scope-enum"].level,
        allowed: rules["scope-enum"].allowedScopes,
        suggest: rules["scope-enum"].suggest,
      },
      fallback.scopeEnum,
    ),
    scopeCase: mergeSeverityRule(
      base.scopeCase,
      rules["scope-case"],
      fallback.scopeCase,
    ),
    scopeEmpty: mergeSeverityRule(
      base.scopeEmpty,
      rules["scope-empty"],
      fallback.scopeEmpty,
    ),
    subjectEmpty: mergeSeverityRule(
      base.subjectEmpty,
      rules["subject-empty"],
      fallback.subjectEmpty,
    ),
    subjectCase: mergeSeverityRule(
      base.subjectCase,
      rules["subject-case"],
      fallback.subjectCase,
    ),
    subjectFullStop: mergeSeverityRule(
      base.subjectFullStop,
      rules["subject-full-stop"],
      fallback.subjectFullStop,
    ),
    headerMaxLength: mergeMaxLengthRule(
      base.headerMaxLength,
      rules["header-max-length"],
      fallback.headerMaxLength,
    ),
    bodyMaxLineLength: mergeMaxLengthRule(
      base.bodyMaxLineLength,
      rules["body-max-line-length"],
      fallback.bodyMaxLineLength,
    ),
    footerMaxLineLength: mergeMaxLengthRule(
      base.footerMaxLineLength,
      rules["footer-max-line-length"],
      fallback.footerMaxLineLength,
    ),
    bodyLeadingBlank: mergeSeverityRule(
      base.bodyLeadingBlank,
      rules["body-leading-blank"],
      fallback.bodyLeadingBlank,
    ),
    footerLeadingBlank: mergeSeverityRule(
      base.footerLeadingBlank,
      rules["footer-leading-blank"],
      fallback.footerLeadingBlank,
    ),
    footerTokenEnum: mergeEnumRule(
      base.footerTokenEnum,
      rules["footer-token-enum"] === undefined ? undefined : {
        level: rules["footer-token-enum"].level,
        allowed: rules["footer-token-enum"].allowedTokens,
        suggest: rules["footer-token-enum"].suggest,
      },
      fallback.footerTokenEnum,
    ),
    footerTokenRequired: mergeRequiredTokensRule(
      base.footerTokenRequired,
      rules["footer-token-required"],
      fallback.footerTokenRequired,
    ),
    breakingChangeDescriptionRequired: mergeSeverityRule(
      base.breakingChangeDescriptionRequired,
      rules["breaking-change-description-required"],
      fallback.breakingChangeDescriptionRequired,
    ),
  };
}

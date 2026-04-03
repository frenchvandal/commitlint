/**
 * Internal lint-preset definitions.
 *
 * @module
 */

import {
  COMMITLINT_BODY_MAX_LINE_LENGTH,
  COMMITLINT_FOOTER_MAX_LINE_LENGTH,
  COMMITLINT_HEADER_MAX_LENGTH,
} from "./constants.ts";
import { DEFAULT_COMMIT_TYPES } from "./commit_types.ts";
import type { LintPreset, Severity } from "./types.ts";

type SeverityRule = {
  readonly severity: Severity;
};

type MaxLengthRule = SeverityRule & {
  readonly max: number;
};

type EnumRule = SeverityRule & {
  readonly allowed: ReadonlyArray<string>;
  readonly suggest: boolean;
};

type RequiredTokensRule = SeverityRule & {
  readonly tokens: ReadonlyArray<string>;
};

export type LintPresetConfig = {
  readonly typeEmpty: SeverityRule | undefined;
  readonly typeEnum: EnumRule | undefined;
  readonly typeCase: SeverityRule | undefined;
  readonly scopeEnum: EnumRule | undefined;
  readonly scopeCase: SeverityRule | undefined;
  readonly scopeEmpty: SeverityRule | undefined;
  readonly subjectEmpty: SeverityRule | undefined;
  readonly subjectCase: SeverityRule | undefined;
  readonly subjectFullStop: SeverityRule | undefined;
  readonly headerMaxLength: MaxLengthRule | undefined;
  readonly bodyMaxLineLength: MaxLengthRule | undefined;
  readonly footerMaxLineLength: MaxLengthRule | undefined;
  readonly bodyLeadingBlank: SeverityRule | undefined;
  readonly footerLeadingBlank: SeverityRule | undefined;
  readonly footerTokenEnum: EnumRule | undefined;
  readonly footerTokenRequired: RequiredTokensRule | undefined;
  readonly breakingChangeDescriptionRequired: SeverityRule | undefined;
};

const ERROR = { severity: "error" } as const;
const WARNING = { severity: "warning" } as const;

export const DEFAULT_LINT_PRESET: LintPreset = "conventional-commits";

export const LINT_PRESET_CONFIGS = {
  "conventional-commits": {
    typeEmpty: ERROR,
    typeEnum: undefined,
    typeCase: undefined,
    scopeEnum: undefined,
    scopeCase: undefined,
    scopeEmpty: undefined,
    subjectEmpty: ERROR,
    subjectCase: undefined,
    subjectFullStop: undefined,
    headerMaxLength: undefined,
    bodyMaxLineLength: undefined,
    footerMaxLineLength: undefined,
    bodyLeadingBlank: ERROR,
    footerLeadingBlank: ERROR,
    footerTokenEnum: undefined,
    footerTokenRequired: undefined,
    breakingChangeDescriptionRequired: undefined,
  },
  "commitlint": {
    typeEmpty: ERROR,
    typeEnum: {
      ...ERROR,
      allowed: DEFAULT_COMMIT_TYPES.map((type) => type.name),
      suggest: true,
    },
    typeCase: ERROR,
    scopeEnum: undefined,
    scopeCase: undefined,
    scopeEmpty: undefined,
    subjectEmpty: ERROR,
    subjectCase: ERROR,
    subjectFullStop: ERROR,
    headerMaxLength: {
      ...ERROR,
      max: COMMITLINT_HEADER_MAX_LENGTH,
    },
    bodyMaxLineLength: {
      ...ERROR,
      max: COMMITLINT_BODY_MAX_LINE_LENGTH,
    },
    footerMaxLineLength: {
      ...ERROR,
      max: COMMITLINT_FOOTER_MAX_LINE_LENGTH,
    },
    bodyLeadingBlank: WARNING,
    footerLeadingBlank: WARNING,
    footerTokenEnum: undefined,
    footerTokenRequired: undefined,
    breakingChangeDescriptionRequired: undefined,
  },
} satisfies Record<LintPreset, LintPresetConfig>;

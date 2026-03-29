/**
 * Internal lint-preset definitions.
 *
 * @module
 */

import {
  COMMITLINT_BODY_MAX_LINE_LENGTH,
  COMMITLINT_FOOTER_MAX_LINE_LENGTH,
  COMMITLINT_HEADER_MAX_LENGTH,
  COMMITLINT_TYPE_LIST,
} from "./constants.ts";
import type { LintPreset, Severity } from "./types.ts";

type SeverityRule = {
  readonly severity: Severity;
};

type MaxLengthRule = SeverityRule & {
  readonly max: number;
};

type TypeEnumRule = SeverityRule & {
  readonly allowedTypes: ReadonlyArray<string>;
  readonly suggest: boolean;
};

export type LintPresetConfig = {
  readonly typeEnum: TypeEnumRule | undefined;
  readonly typeCase: SeverityRule | undefined;
  readonly subjectCase: SeverityRule | undefined;
  readonly subjectFullStop: SeverityRule | undefined;
  readonly headerMaxLength: MaxLengthRule | undefined;
  readonly bodyMaxLineLength: MaxLengthRule | undefined;
  readonly footerMaxLineLength: MaxLengthRule | undefined;
  readonly bodyLeadingBlank: SeverityRule;
  readonly footerLeadingBlank: SeverityRule;
};

const ERROR = { severity: "error" } as const;
const WARNING = { severity: "warning" } as const;

export const DEFAULT_LINT_PRESET: LintPreset = "conventional-commits";

export const LINT_PRESET_CONFIGS = {
  "conventional-commits": {
    typeEnum: undefined,
    typeCase: undefined,
    subjectCase: undefined,
    subjectFullStop: undefined,
    headerMaxLength: undefined,
    bodyMaxLineLength: undefined,
    footerMaxLineLength: undefined,
    bodyLeadingBlank: ERROR,
    footerLeadingBlank: ERROR,
  },
  "commitlint": {
    typeEnum: {
      ...ERROR,
      allowedTypes: COMMITLINT_TYPE_LIST,
      suggest: true,
    },
    typeCase: ERROR,
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
  },
} satisfies Record<LintPreset, LintPresetConfig>;

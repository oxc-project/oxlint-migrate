import type { Linter } from 'eslint';

type OxlintConfigPlugins = string[];
type OxlintConfigJsPlugins = string[];
type OxlintConfigCategories = Partial<Record<Category, unknown>>;
type OxlintConfigEnv = Record<string, boolean>;
type OxlintConfigIgnorePatterns = string[];

// Known oxlint-supported settings keys
// See: https://github.com/oxc-project/oxc/blob/main/crates/oxc_linter/src/config/settings/mod.rs
export const OXLINT_SUPPORTED_SETTINGS_KEYS = [
  'jsx-a11y',
  'next',
  'react',
  'jsdoc',
  'vitest',
] as const;

export type OxlintSupportedSettingsKey =
  (typeof OXLINT_SUPPORTED_SETTINGS_KEYS)[number];

export type OxlintSettings = {
  [K in OxlintSupportedSettingsKey]?: Record<string, unknown>;
} & Record<string, Record<string, unknown> | undefined>;

export type OxlintConfigOverride = {
  files: string[];
  env?: OxlintConfigEnv;
  globals?: Linter.Globals;
  plugins?: OxlintConfigPlugins;
  jsPlugins?: OxlintConfigJsPlugins;
  categories?: OxlintConfigCategories;
  rules?: Partial<Linter.RulesRecord>;
};

export type OxlintConfig = {
  $schema?: string;
  env?: OxlintConfigEnv;
  globals?: Linter.Globals;
  plugins?: OxlintConfigPlugins;
  jsPlugins?: OxlintConfigJsPlugins;
  categories?: OxlintConfigCategories;
  rules?: Partial<Linter.RulesRecord>;
  overrides?: OxlintConfigOverride[];
  ignorePatterns?: OxlintConfigIgnorePatterns;
  settings?: OxlintSettings;
};

export type OxlintConfigOrOverride = OxlintConfig | OxlintConfigOverride;

export type RuleSkippedCategory =
  | 'nursery'
  | 'type-aware'
  | 'unsupported'
  | 'js-plugins';

export type SkippedCategoryGroup = Record<RuleSkippedCategory, string[]>;

export type Reporter = {
  addWarning(message: string): void;
  getWarnings(): string[];
  markSkipped(rule: string, category: RuleSkippedCategory): void;
  removeSkipped(rule: string, category: RuleSkippedCategory): void;
  getSkippedRulesByCategory(): SkippedCategoryGroup;
};

export type Options = {
  reporter?: Reporter;
  merge?: boolean;
  withNursery?: boolean;
  typeAware?: boolean;
  jsPlugins?: boolean;
};

export type Category =
  | 'style'
  | 'correctness'
  | 'nursery'
  | 'suspicious'
  | 'pedantic'
  | 'perf'
  | 'restriction';

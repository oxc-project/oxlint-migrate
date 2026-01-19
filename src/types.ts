import type { Linter } from 'eslint';

type OxlintConfigPlugins = string[];
type OxlintConfigJsPlugins = string[];
type OxlintConfigCategories = Partial<Record<Category, unknown>>;
type OxlintConfigEnv = Record<string, boolean>;
type OxlintConfigIgnorePatterns = string[];

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
};

export type OxlintConfigOrOverride = OxlintConfig | OxlintConfigOverride;

export type RuleSkippedCategory = 'nursery' | 'type-aware' | 'unsupported';

export type SkippedCategoryGroup = Record<RuleSkippedCategory, string[]>;

export type Reporter = {
  report(message: string): void;
  remove(message: string): void;
  getReports(): string[];
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

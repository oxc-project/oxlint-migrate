import type { Linter } from 'eslint';

type OxlintConfigPlugins = string[];
type OxlintConfigJsPlugins = string[];
type OxlintConfigCategories = Record<string, unknown>;
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

export type Reporter = {
  report(message: string): void;
  remove(message: string): void;
  getReports(): string[];
};

export type Options = {
  reporter?: Reporter;
  merge?: boolean;
  withNursery?: boolean;
  typeAware?: boolean;
  jsPlugins?: boolean;
};

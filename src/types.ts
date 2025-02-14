import type { Linter } from 'eslint';

type OxlintConfigPlugins = string[];
type OxlintConfigCategories = Record<string, unknown>;
type OxlintConfigEnv = Record<string, boolean>;
type OxlintConfigIgnorePatterns = string[];

export type OxlintConfigOverride = {
  files: string[];
  env?: OxlintConfigEnv;
  globals?: Linter.Globals;
  plugins?: OxlintConfigPlugins;
  rules?: Partial<Linter.RulesRecord>;
};

export type OxlintConfig = {
  $schema?: string;
  env?: OxlintConfigEnv;
  globals?: Linter.Globals;
  plugins?: OxlintConfigPlugins;
  categories?: OxlintConfigCategories;
  rules?: Partial<Linter.RulesRecord>;
  overrides?: OxlintConfigOverride[];
  ignorePatterns?: OxlintConfigIgnorePatterns;
};

export type OxlintConfigOrOverride = OxlintConfig | OxlintConfigOverride;

export type Reporter = ((warning: string) => void) | undefined;

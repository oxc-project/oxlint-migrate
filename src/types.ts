/**
 * ESLint type definitions compatible with ESLint 9 and 10.
 * Based on @eslint/core types to avoid direct eslint dependency.
 *
 * This namespace contains type definitions that mirror ESLint's Linter types,
 * allowing the codebase to be independent of the eslint package while maintaining
 * compatibility with both ESLint 9 and 10.
 */
export namespace ESLint {
  /**
   * Represents the severity level for a rule as a number.
   * - `0` means off
   * - `1` means warn
   * - `2` means error
   */
  export type SeverityLevel = 0 | 1 | 2;

  /**
   * Represents the severity level for a rule as a string.
   */
  export type SeverityName = 'off' | 'warn' | 'error';

  /**
   * The numeric or human readable severity level for a rule.
   */
  export type Severity = SeverityName | SeverityLevel;

  /**
   * The configuration for a rule.
   * Can be a severity level or an array with severity and options.
   */
  export type RuleConfig<RuleOptions extends unknown[] = unknown[]> =
    | Severity
    | [Severity, ...Partial<RuleOptions>];

  /**
   * A collection of rules and their configurations.
   */
  export interface RulesRecord {
    [key: string]: RuleConfig;
  }

  /**
   * Global variable access configuration.
   */
  export type GlobalAccess =
    | boolean
    | 'off'
    | 'readable'
    | 'readonly'
    | 'writable'
    | 'writeable';

  /**
   * Configuration for global variables.
   */
  export interface GlobalsConfig {
    [name: string]: GlobalAccess;
  }

  /**
   * ESLint flat configuration object compatible with ESLint 9 and 10.
   * Uses index signature to allow additional properties from various ESLint configurations.
   */
  export interface Config<Rules extends RulesRecord = RulesRecord> {
    /** A string to identify the configuration object */
    name?: string;
    /** Path to the directory where the configuration should apply */
    basePath?: string;
    /** Glob patterns indicating files this config applies to */
    files?: (string | string[])[];
    /** Glob patterns indicating files this config doesn't apply to */
    ignores?: string[];
    /** Language options including globals, parser, etc */
    languageOptions?: {
      /** Global variables */
      globals?: GlobalsConfig;
      /** Parser options */
      parserOptions?: Record<string, unknown>;
      [key: string]: unknown;
    };
    /** Linter options */
    linterOptions?: {
      noInlineConfig?: boolean;
      reportUnusedDisableDirectives?: boolean | Severity;
      [key: string]: unknown;
    };
    /** Processor name or object */
    processor?: string | object;
    /** Plugin configurations */
    plugins?: Record<string, unknown>;
    /** Rule configurations */
    rules?: Partial<Rules>;
    /** Settings available to all rules */
    settings?: Record<string, unknown>;
    /** Legacy env configuration */
    env?: Record<string, boolean>;
    /** Legacy globals configuration (for backwards compatibility) */
    globals?: GlobalsConfig;
    /** Legacy overrides configuration */
    overrides?: unknown[];
    /** Index signature to accept any additional properties */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
  }
}

// Re-export types for backward compatibility and convenience
export type SeverityLevel = ESLint.SeverityLevel;
export type SeverityName = ESLint.SeverityName;
export type Severity = ESLint.Severity;
export type RuleConfig<RuleOptions extends unknown[] = unknown[]> =
  ESLint.RuleConfig<RuleOptions>;
export type RulesRecord = ESLint.RulesRecord;
export type GlobalAccess = ESLint.GlobalAccess;
export type GlobalsConfig = ESLint.GlobalsConfig;
export type Config<Rules extends RulesRecord = RulesRecord> =
  ESLint.Config<Rules>;

type OxlintConfigPlugins = string[];
type OxlintConfigJsPlugins = string[];
type OxlintConfigCategories = Partial<Record<Category, unknown>>;
type OxlintConfigEnv = Record<string, boolean>;
type OxlintConfigIgnorePatterns = string[];

export type OxlintSupportedSettingsKey =
  | 'jsx-a11y'
  | 'next'
  | 'react'
  | 'jsdoc'
  | 'vitest';

export type OxlintSettings = {
  [K in OxlintSupportedSettingsKey]?: Record<string, unknown>;
} & Record<string, Record<string, unknown> | undefined>;

export type OxlintConfigOverride = {
  files: string[];
  env?: OxlintConfigEnv;
  globals?: GlobalsConfig;
  plugins?: OxlintConfigPlugins;
  jsPlugins?: OxlintConfigJsPlugins;
  categories?: OxlintConfigCategories;
  rules?: Partial<RulesRecord>;
};

export type OxlintConfig = {
  $schema?: string;
  env?: OxlintConfigEnv;
  globals?: GlobalsConfig;
  plugins?: OxlintConfigPlugins;
  jsPlugins?: OxlintConfigJsPlugins;
  categories?: OxlintConfigCategories;
  rules?: Partial<RulesRecord>;
  overrides?: OxlintConfigOverride[];
  ignorePatterns?: OxlintConfigIgnorePatterns;
  settings?: OxlintSettings;
};

export type OxlintConfigOrOverride = OxlintConfig | OxlintConfigOverride;

export type RuleSkippedCategory =
  | 'nursery'
  | 'type-aware'
  | 'not-implemented'
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

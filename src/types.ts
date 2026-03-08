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

  export interface Plugin {
    meta?: {
      name?: string;
    };
    configs?: Record<string, unknown[]> | undefined;
    environments?: Record<string, unknown> | undefined;
    languages?: Record<string, unknown> | undefined;
    processors?: Record<string, unknown> | undefined;
    rules?: RulesRecord | undefined;
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
    plugins?: Record<string, Plugin>;
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
    [key: string]: any;
  }
}

import type {
  DummyRule,
  OxlintConfig as OxlintConfigInternal,
  OxlintOverride,
  RuleCategories,
  OxlintGlobals,
} from 'oxlint';

export type OxlintConfig = Omit<OxlintConfigInternal, 'overrides'> & {
  $schema?: string;
  overrides?: OxlintConfigOverride[];
};

export type OxlintSettings = Exclude<
  OxlintConfigInternal['settings'],
  undefined
>;

export type OxlintSupportedSettingsKey = keyof OxlintSettings;

export type OxlintOptions = Exclude<OxlintConfigInternal['options'], undefined>;

export type OxlintConfigOverride = OxlintOverride & {
  categories?: OxlintConfigInternal['categories'];
};

export type OxlintConfigOrOverride =
  | OxlintConfigInternal
  | OxlintConfigOverride;

export type OxlintConfigPlugin = Exclude<
  OxlintConfigInternal['plugins'],
  null | undefined
>[number];

export type OxlintConfigGlobalsValue = OxlintGlobals[string];

// this is type safer, but oxlint does make a broader approach with AllowWarnDeny | unknown[]
// export type OxlintConfigRuleSeverity =
//   | AllowWarnDeny
//   | [AllowWarnDeny, ...unknown[]];
export type OxlintConfigRuleSeverity = DummyRule;

export type OxlintCategory = keyof RuleCategories;

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

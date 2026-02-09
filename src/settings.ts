import type { Linter } from 'eslint';
import type {
  Options,
  OxlintConfig,
  OxlintSettings,
  OxlintSupportedSettingsKey,
} from './types.js';

// Known oxlint-supported settings keys, for use with native rules.
// See: https://github.com/oxc-project/oxc/blob/main/crates/oxc_linter/src/config/settings/mod.rs
export const OXLINT_SUPPORTED_SETTINGS_KEYS: OxlintSupportedSettingsKey[] = [
  'jsx-a11y',
  'next',
  'react',
  'jsdoc',
  'vitest',
];

// Sub-keys within supported settings groups that oxlint does not support.
const UNSUPPORTED_SETTINGS_SUB_KEYS: Record<string, string[]> = {
  react: ['pragma', 'fragment'],
  vitest: ['vitestImports'],
};

/**
 * Deep merge source into target, combining nested objects rather than replacing them.
 * Arrays are replaced, not merged. Mutates `target` in place.
 */
const deepMerge = (
  target: Record<string, unknown>,
  source: Record<string, unknown>
): void => {
  for (const [key, value] of Object.entries(source)) {
    if (
      value !== null &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      key in target &&
      target[key] !== null &&
      typeof target[key] === 'object' &&
      !Array.isArray(target[key])
    ) {
      // Deep merge nested objects
      deepMerge(
        target[key] as Record<string, unknown>,
        value as Record<string, unknown>
      );
    } else {
      target[key] = value;
    }
  }
};

/**
 * Check if a settings key is known to be supported by oxlint.
 */
const isSupportedSettingsKey = (key: OxlintSupportedSettingsKey): boolean => {
  return OXLINT_SUPPORTED_SETTINGS_KEYS.includes(key);
};

/**
 * Transform ESLint settings to oxlint settings.
 *
 * Only processes settings for the base config (not overrides) since oxlint
 * does not support settings in overrides.
 *
 * Only known oxlint-supported settings keys are migrated:
 * - jsx-a11y
 * - next
 * - react
 * - jsdoc
 * - vitest
 *
 * @param eslintConfig - The source ESLint config
 * @param targetConfig - The target oxlint config (must be base config, not override)
 * @param options - Migration options
 */
export const transformSettings = (
  eslintConfig: Linter.Config,
  targetConfig: OxlintConfig,
  options?: Options
): void => {
  // Early return if no settings to process
  if (
    eslintConfig.settings === undefined ||
    eslintConfig.settings === null ||
    Object.keys(eslintConfig.settings).length === 0
  ) {
    return;
  }

  const eslintSettings = eslintConfig.settings;
  const filteredSettings: OxlintSettings = {};
  const skippedKeys: string[] = [];

  for (const [key, value] of Object.entries(eslintSettings)) {
    // Skip non-object values
    if (value === null || typeof value !== 'object') {
      skippedKeys.push(key);
      continue;
    }

    if (!options?.jsPlugins && !isSupportedSettingsKey(key as any)) {
      skippedKeys.push(key);
      continue;
    }

    // skip all import settings as they are unsupported by Oxlint.
    if (key === 'import' || key.startsWith('import/')) {
      skippedKeys.push(key);
      continue;
    }

    let settingsValue = value as Record<string, unknown>;

    // Special case: react.version = "detect" is not supported by oxlint
    if (key === 'react' && settingsValue.version === 'detect') {
      options?.reporter?.addWarning(
        `react.version "detect" is not supported by oxlint. ` +
          `Please specify an explicit version (e.g., "18.2.0") in your oxlint config.`
      );
      const { version: _, ...restReactSettings } = settingsValue;
      settingsValue = restReactSettings;
    }

    // Strip unsupported settings for specific settings groups, e.g. `react.pragma`
    // or `vitest.vitestImports`, and warn about them.
    const unsupportedSubKeys = UNSUPPORTED_SETTINGS_SUB_KEYS[key];
    if (unsupportedSubKeys !== undefined) {
      const strippedKeys: string[] = [];
      for (const subKey of unsupportedSubKeys) {
        if (subKey in settingsValue) {
          strippedKeys.push(`${key}.${subKey}`);
          const { [subKey]: _, ...rest } = settingsValue;
          settingsValue = rest;
        }
      }
      if (strippedKeys.length > 0) {
        options?.reporter?.addWarning(
          `Settings not migrated (not supported by oxlint): ${strippedKeys.join(', ')}.`
        );
      }
    }

    // If no settings remain after stripping unsupported sub-keys, skip entirely
    if (Object.keys(settingsValue).length === 0) {
      continue;
    }

    filteredSettings[key] = settingsValue;
  }

  // Warn about unsupported settings that were skipped
  if (skippedKeys.length > 0) {
    options?.reporter?.addWarning(
      `Settings not migrated (not supported by oxlint): ${skippedKeys.join(', ')}.`
    );
  }

  // If no settings to add, return early
  if (Object.keys(filteredSettings).length === 0) {
    return;
  }

  // Merge or set settings
  if (targetConfig.settings === undefined) {
    targetConfig.settings = {};
  }

  if (options?.merge) {
    deepMerge(
      targetConfig.settings as Record<string, unknown>,
      filteredSettings as Record<string, unknown>
    );
  } else {
    Object.assign(targetConfig.settings, filteredSettings);
  }
};

/**
 * Warn when settings are found in an override config, since oxlint does not
 * support settings in overrides.
 *
 * @param eslintConfig - The ESLint config being processed
 * @param options - Migration options
 */
export const warnSettingsInOverride = (
  eslintConfig: Linter.Config,
  options?: Options
): void => {
  if (
    eslintConfig.settings !== undefined &&
    eslintConfig.settings !== null &&
    Object.keys(eslintConfig.settings).length > 0
  ) {
    const settingsKeys = Object.keys(eslintConfig.settings).join(', ');
    options?.reporter?.addWarning(
      `Settings found in config with 'files' pattern (${settingsKeys}). ` +
        `Oxlint does not support settings in overrides, these settings will be skipped.`
    );
  }
};

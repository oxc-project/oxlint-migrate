import type { Linter } from 'eslint';
import {
  Options,
  OxlintConfig,
  OxlintSettings,
  OXLINT_SUPPORTED_SETTINGS_KEYS,
} from './types.js';

/**
 * Deep merge two objects, combining nested objects rather than replacing them.
 * Arrays are replaced, not merged.
 */
const deepMerge = (
  target: Record<string, unknown>,
  source: Record<string, unknown>
): Record<string, unknown> => {
  const result = { ...target };

  for (const [key, value] of Object.entries(source)) {
    if (
      value !== null &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      key in result &&
      result[key] !== null &&
      typeof result[key] === 'object' &&
      !Array.isArray(result[key])
    ) {
      // Deep merge nested objects
      result[key] = deepMerge(
        result[key] as Record<string, unknown>,
        value as Record<string, unknown>
      );
    } else {
      result[key] = value;
    }
  }

  return result;
};

/**
 * Check if a settings key is known to be supported by oxlint.
 */
const isSupportedSettingsKey = (key: string): boolean => {
  return (OXLINT_SUPPORTED_SETTINGS_KEYS as readonly string[]).includes(key);
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

    const isSupported = isSupportedSettingsKey(key);

    if (isSupported) {
      let settingsValue = value as Record<string, unknown>;

      // Special case: react.version = "detect" is not supported by oxlint
      if (key === 'react' && settingsValue.version === 'detect') {
        options?.reporter?.addWarning(
          `react.version "detect" is not supported by oxlint. ` +
            `Please specify an explicit version (e.g., "18.2.0") in your oxlint config.`
        );
        // Remove the version field but keep other react settings
        const { version: _, ...restReactSettings } = settingsValue;
        settingsValue = restReactSettings;
        // If no other react settings, skip entirely
        if (Object.keys(settingsValue).length === 0) {
          continue;
        }
      }

      filteredSettings[key] = settingsValue;
    } else {
      skippedKeys.push(key);
    }
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
  if (options?.merge && targetConfig.settings !== undefined) {
    // Deep merge at the plugin level
    for (const [key, value] of Object.entries(filteredSettings)) {
      if (key in targetConfig.settings && targetConfig.settings[key]) {
        targetConfig.settings[key] = deepMerge(
          targetConfig.settings[key] as Record<string, unknown>,
          value as Record<string, unknown>
        );
      } else {
        targetConfig.settings[key] = value;
      }
    }
  } else {
    if (targetConfig.settings === undefined) {
      targetConfig.settings = {};
    }
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

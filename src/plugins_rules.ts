import type { Linter } from 'eslint';
import * as rules from './generated/rules.js';
import {
  Options,
  OxlintConfig,
  OxlintConfigOrOverride,
  OxlintConfigOverride,
  type Category,
} from './types.js';
import {
  rulesPrefixesForPlugins,
  typescriptRulesExtendEslintRules,
} from './constants.js';
import {
  deduplicateJsPlugins,
  enableJsPluginRule,
  isIgnoredPluginRule,
} from './jsPlugins.js';
import { buildUnsupportedRuleExplanations, isEqualDeep } from './utilities.js';

const allRules = Object.values(rules).flat();
const unsupportedRuleExplanations = buildUnsupportedRuleExplanations();

/**
 * checks if value is validSet, or if validSet is an array, check if value is first value of it
 */
const isValueInSet = (value: unknown, validSet: unknown[]) =>
  validSet.includes(value) ||
  (Array.isArray(value) && validSet.includes(value[0]));

/**
 * check if the value is "error", "warn", 1, 2, ["error", ...], ["warn", ...], [1, ...], or [2, ...]
 */
const isActiveValue = (value: unknown) =>
  isValueInSet(value, ['error', 'warn', 1, 2]);

export const isOffValue = (value: unknown) => isValueInSet(value, ['off', 0]);

const isWarnValue = (value: unknown) => isValueInSet(value, ['warn', 1]);

const isErrorValue = (value: unknown) => isValueInSet(value, ['error', 2]);

const normalizeSeverityValue = (
  value: Linter.RuleEntry | undefined
): Linter.RuleEntry | undefined => {
  if (value === undefined) {
    return value;
  }

  if (isWarnValue(value)) {
    if (Array.isArray(value)) {
      value[0] = 'warn';
      return value;
    }

    return 'warn';
  } else if (isErrorValue(value)) {
    if (Array.isArray(value)) {
      value[0] = 'error';
      return value;
    }

    return 'error';
  }

  if (isOffValue(value)) {
    if (Array.isArray(value)) {
      value[0] = 'off';
      return value;
    }

    return 'off';
  }

  return undefined;
};

// ESLint flat config: later configs override earlier ones for matching files.
// A base config (no files) matches ALL files and comes after earlier overrides,
// so it should "win" over any override that set this rule previously.
// In oxlint, overrides take precedence over root, so we must remove the rule
// from overrides to avoid the override incorrectly winning.
const removePreviousOverrideRule = (
  rule: string,
  eslintConfig: Linter.Config,
  overrides?: OxlintConfigOverride[]
): void => {
  if (eslintConfig.files === undefined && overrides) {
    for (const override of overrides) {
      if (override.rules?.[rule]) {
        delete override.rules[rule];
      }
    }
  }
};

/**
 * Merges a new rule configuration with an existing one, preserving options when
 * the new config only specifies a severity level.
 *
 * ESLint flat config behavior: When a rule is redefined with only a severity
 * (e.g., 'error'), the existing options should be preserved. Only when new
 * options are explicitly provided should they override the existing ones.
 *
 * Special case: When severity is 'off', options are not preserved since the
 * rule is disabled and options don't matter.
 *
 * @param existingConfig - The current rule configuration
 * @param newConfig - The new rule configuration to merge
 * @returns The merged rule configuration
 */
const mergeRuleConfig = (
  existingConfig: Linter.RuleEntry | undefined,
  newConfig: Linter.RuleEntry | undefined
): Linter.RuleEntry | undefined => {
  if (newConfig === undefined) {
    return existingConfig;
  }

  if (existingConfig === undefined) {
    return newConfig;
  }

  // If the new config turns the rule off, don't preserve options
  if (isOffValue(newConfig)) {
    return newConfig;
  }

  // If the new config is just a severity string/number and the existing config has options,
  // preserve the existing options and update the severity
  const newIsSimple = !Array.isArray(newConfig);
  const existingIsArray = Array.isArray(existingConfig);

  if (newIsSimple && existingIsArray && existingConfig.length > 1) {
    // New config is just a severity, existing has options
    // Return array with new severity but keep existing options
    return [newConfig, ...existingConfig.slice(1)];
  }

  // If new config is an array with only severity (length 1) and existing has options
  if (
    Array.isArray(newConfig) &&
    newConfig.length === 1 &&
    existingIsArray &&
    existingConfig.length > 1
  ) {
    // New config has severity only, existing has options
    // Return array with new severity but keep existing options
    return [newConfig[0], ...existingConfig.slice(1)];
  }

  // Otherwise, new config completely replaces the old one
  // This handles cases where:
  // - New config has explicit options (array with length > 1)
  // - Both are simple severity values
  // - Existing config is simple (no options to preserve)
  return newConfig;
};

export const transformRuleEntry = (
  eslintConfig: Linter.Config,
  targetConfig: OxlintConfigOrOverride,
  baseConfig?: OxlintConfig,
  options?: Options,
  overrides?: OxlintConfigOverride[]
): void => {
  if (eslintConfig.rules === undefined) {
    return;
  }

  if (targetConfig.rules === undefined) {
    targetConfig.rules = {};
  }

  for (const [rule, config] of Object.entries(eslintConfig.rules)) {
    const normalizedConfig = normalizeSeverityValue(config);

    // removing rules from previous "overrides"
    // only works on non-merge because `overrides` is already prefilled from previous result.
    if (!options?.merge) {
      removePreviousOverrideRule(rule, eslintConfig, overrides);
    }

    if (allRules.includes(rule)) {
      if (!options?.withNursery && rules.nurseryRules.includes(rule)) {
        options?.reporter?.markSkipped(rule, 'nursery');
        continue;
      }

      if (!options?.typeAware && rules.typeAwareRules.includes(rule)) {
        options?.reporter?.markSkipped(rule, 'type-aware');
        continue;
      }

      if (options?.merge) {
        // when merge, only override if not exists
        // for non merge override it because eslint/typescript rules
        if (!(rule in targetConfig.rules)) {
          targetConfig.rules[rule] = normalizedConfig;
        }
      } else {
        // Merge the new config with the existing one to preserve options
        // For file overrides, also check the base config for existing rules
        const existingConfig =
          rule in targetConfig.rules
            ? targetConfig.rules[rule]
            : baseConfig?.rules?.[rule];
        targetConfig.rules[rule] = mergeRuleConfig(
          existingConfig,
          normalizedConfig
        );
      }
    } else {
      // For unsupported rules, when jsPlugins is enabled, always try to map
      // them to a JS plugin rule, regardless of severity (including 'off').
      if (options?.jsPlugins) {
        // If the rule is disabled, in base config, avoid enabling the jsPlugin to prevent noise.
        if (isOffValue(normalizedConfig)) {
          if (eslintConfig.files === undefined) {
            // base config: drop disabled rule entirely
            delete targetConfig.rules[rule];
          } else {
            // override: keep the disabled rule and add the jsPlugin
            // so oxlint can resolve the rule name
            if (!isIgnoredPluginRule(rule)) {
              enableJsPluginRule(targetConfig, rule, normalizedConfig);
            }
          }
          // also remove any previously queued unsupported report for base
          if (eslintConfig.files === undefined) {
            options?.reporter?.removeSkipped(rule, 'js-plugins');
            options?.reporter?.removeSkipped(rule, 'not-implemented');
            options?.reporter?.removeSkipped(rule, 'unsupported');
          }
          continue;
        }

        if (!enableJsPluginRule(targetConfig, rule, normalizedConfig)) {
          const category = unsupportedRuleExplanations[rule]
            ? 'unsupported'
            : 'not-implemented';
          options?.reporter?.markSkipped(rule, category);
        }
        continue;
      }

      // Non-jsPlugins path or failed jsPlugin mapping: handle disabled rules
      if (!isActiveValue(normalizedConfig)) {
        // if rule is disabled, remove it.
        if (isOffValue(normalizedConfig)) {
          delete targetConfig.rules[rule];
        }
        // only remove the reporter diagnostics when it is in a base config.
        if (eslintConfig.files === undefined) {
          options?.reporter?.removeSkipped(rule, 'not-implemented');
          options?.reporter?.removeSkipped(rule, 'unsupported');
        }
        continue;
      }

      if (!options?.jsPlugins && !isIgnoredPluginRule(rule)) {
        options?.reporter?.markSkipped(rule, 'js-plugins');
        continue;
      }

      // Active unsupported rule: mark as skipped
      const category = unsupportedRuleExplanations[rule]
        ? 'unsupported'
        : 'not-implemented';
      options?.reporter?.markSkipped(rule, category);
    }
  }
};

export const detectNeededRulesPlugins = (
  targetConfig: OxlintConfigOrOverride
): void => {
  if (targetConfig.rules === undefined) {
    return;
  }

  if (targetConfig.plugins === undefined) {
    targetConfig.plugins = [];
  }

  for (const rule of Object.keys(targetConfig.rules)) {
    // eslint rule has no / prefix and is supported by oxlint out of the box
    // ToDo: not every rule
    if (!rule.includes('/')) {
      continue;
    }

    for (const [prefix, plugin] of Object.entries(rulesPrefixesForPlugins)) {
      if (
        rule.startsWith(`${prefix}/`) &&
        !targetConfig.plugins.includes(plugin)
      ) {
        targetConfig.plugins.push(plugin);
      }
    }
  }

  // only in overrides cleanup plugins, in root we want to disable the default ones
  if ('files' in targetConfig && targetConfig.plugins.length === 0) {
    delete targetConfig.plugins;
  }
};

export const cleanUpUselessOverridesPlugins = (config: OxlintConfig): void => {
  if (config.overrides === undefined) {
    return;
  }

  if (config.plugins !== undefined) {
    for (const override of config.overrides) {
      if (override.plugins === undefined) {
        continue;
      }

      override.plugins = override.plugins.filter(
        (overridePlugin) => !config.plugins!.includes(overridePlugin)
      );

      if (override.plugins.length === 0) {
        delete override.plugins;
      }
    }
  }
};

export const cleanUpUselessOverridesRules = (config: OxlintConfig): void => {
  if (config.overrides === undefined) {
    return;
  }

  for (let i = 0; i < config.overrides.length; i++) {
    const current = config.overrides[i];

    // Merge consecutive same-files overrides into prev and splice out current.
    // Non-consecutive same-files overrides must NOT be merged — intervening
    // overrides with overlapping file patterns would change precedence.
    if (i > 0) {
      const previous = config.overrides[i - 1];
      if (isEqualDeep(previous.files, current.files)) {
        mergeOverrideProperties(previous, current);
        config.overrides.splice(i, 1);
        i -= 2; // re-process prev (merge may have changed root-matching)
        continue;
      }
    }

    // Remove rules matching root config
    removeRootMatchingRules(config, i);
  }
};

/** Merge all properties from `source` into `target` (same-files overrides). */
const mergeOverrideProperties = (
  target: OxlintConfigOverride,
  source: OxlintConfigOverride
): void => {
  // Rules: last-wins per key
  if (source.rules) {
    target.rules = { ...target.rules, ...source.rules };
  }

  // Array properties: union
  if (source.plugins) {
    target.plugins = [
      ...new Set([...(target.plugins ?? []), ...source.plugins]),
    ];
  }
  if (source.jsPlugins) {
    target.jsPlugins = deduplicateJsPlugins([
      ...(target.jsPlugins ?? []),
      ...source.jsPlugins,
    ]);
  }

  // Object properties: last-wins per key
  if (source.env) {
    target.env = { ...target.env, ...source.env };
  }
  if (source.globals) {
    target.globals = { ...target.globals, ...source.globals };
  }
  if (source.categories) {
    target.categories = { ...target.categories, ...source.categories };
  }
};

/**
 * Remove rules from `config.overrides[overrideIndex]` that match root config,
 * unless a previous override also has the rule (meaning it overrides root with
 * a different value — same-as-root rules are removed earlier in the loop).
 */
const removeRootMatchingRules = (
  config: OxlintConfig,
  overrideIndex: number
): void => {
  const override = config.overrides![overrideIndex];

  if (!override.rules || !config.rules) {
    return;
  }

  for (const [rule, settings] of Object.entries(override.rules)) {
    if (config.rules[rule] === settings) {
      const previousOverrideHasRule = config
        .overrides!.slice(0, overrideIndex)
        .some((prev) => prev.rules?.[rule] !== undefined);
      if (!previousOverrideHasRule) {
        delete override.rules[rule];
      }
    }
  }

  if (Object.keys(override.rules).length === 0) {
    delete override.rules;
  }
};

export const cleanUpRulesWhichAreCoveredByCategory = (
  config: OxlintConfigOrOverride
): void => {
  if (config.rules === undefined || config.categories === undefined) {
    return;
  }

  const enabledCategories: Category[] = Object.entries(config.categories)
    .filter(([, severity]) => severity === 'warn' || severity === 'error')
    .map(([category]) => category as Category);

  for (const [rule, settings] of Object.entries(config.rules)) {
    for (const category of enabledCategories) {
      // check if the rule is inside the enabled category
      if (
        `${category}Rules` in rules &&
        (rules[`${category}Rules`] as string[]).includes(rule)
      ) {
        // check if the severity is the same. only check when no custom config is passed
        if (
          settings === config.categories[category] ||
          (Array.isArray(settings) &&
            settings.length === 1 &&
            settings[0] === config.categories[category])
        ) {
          delete config.rules[rule];
        }
      }
    }
  }
};

const getEnabledCategories = (config: OxlintConfig): Category[] => {
  if (config.categories === undefined) {
    return ['correctness'];
  }
  const categories: Category[] = Object.entries(config.categories)
    .filter(([, severity]) => severity === 'warn' || severity === 'error')
    .map(([category]) => category as Category);

  // special case: when correctness is not defined, we consider it enabled
  if (Object.keys(config.categories).includes('correctness')) {
    return categories;
  }

  return [...categories, 'correctness'];
};

const isRuleInEnabledCategory = (
  rule: string,
  enabledCategories: Category[]
): boolean => {
  for (const category of enabledCategories) {
    if (
      `${category}Rules` in rules &&
      rules[`${category}Rules`].includes(rule)
    ) {
      return true;
    }
  }
  return false;
};

export const cleanUpDisabledRootRules = (config: OxlintConfig): void => {
  if (config.rules === undefined) {
    return;
  }

  const enabledCategories = getEnabledCategories(config);

  for (const [rule, settings] of Object.entries(config.rules)) {
    if (
      isOffValue(settings) &&
      !isRuleInEnabledCategory(rule, enabledCategories)
    ) {
      delete config.rules[rule];
    }
  }
};

export const replaceTypescriptAliasRules = (
  config: OxlintConfigOrOverride
): void => {
  if (config.rules === undefined) {
    return;
  }
  for (const rule of Object.keys(config.rules)) {
    const prefix = '@typescript-eslint/';
    if (!rule.startsWith(prefix)) {
      continue;
    }

    const eslintRule = rule.slice(prefix.length);

    if (!typescriptRulesExtendEslintRules.includes(eslintRule)) {
      continue;
    }

    config.rules[eslintRule] = config.rules[rule];

    // delete ts rule
    delete config.rules[rule];
  }

  // cleanup
  if (Object.keys(config.rules).length === 0) {
    delete config.rules;
  }
};

/**
 * Oxlint supports eslint-plugin-n rules only under the `node` plugin name
 */
export const replaceNodePluginName = (config: OxlintConfigOrOverride): void => {
  if (config.rules === undefined) {
    return;
  }

  for (const rule of Object.keys(config.rules)) {
    const prefix = 'n/';
    if (!rule.startsWith(prefix)) {
      continue;
    }

    const nodeRule = `node/${rule.slice(prefix.length)}`;

    config.rules[nodeRule] = config.rules[rule];
    // delete old rule
    delete config.rules[rule];
  }
};

/**
 * Oxlint supports the eslint-plugin-react-refresh/only-export-components rule
 * under the `react` plugin name.
 */
export const replaceReactRefreshPluginName = (
  config: OxlintConfigOrOverride
): void => {
  if (config.rules === undefined) {
    return;
  }

  for (const rule of Object.keys(config.rules)) {
    const prefix = 'react-refresh/';
    if (!rule.startsWith(prefix)) {
      continue;
    }

    const reactRefreshRule = `react/${rule.slice(prefix.length)}`;

    config.rules[reactRefreshRule] = config.rules[rule];
    // delete old rule
    delete config.rules[rule];
  }
};

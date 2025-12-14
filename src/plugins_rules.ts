import type { Linter } from 'eslint';
import * as rules from './generated/rules.js';
import {
  Options,
  OxlintConfig,
  OxlintConfigOrOverride,
  type Category,
} from './types.js';
import {
  rulesPrefixesForPlugins,
  typescriptRulesExtendEslintRules,
  typescriptTypeAwareRules,
} from './constants.js';
import { enableJsPluginRule, isIgnoredPluginRule } from './jsPlugins.js';

const allRules = Object.values(rules).flat();

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

const isOffValue = (value: unknown) => isValueInSet(value, ['off', 0]);

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

export const transformRuleEntry = (
  eslintConfig: Linter.Config,
  targetConfig: OxlintConfigOrOverride,
  options?: Options
): void => {
  if (eslintConfig.rules === undefined) {
    return;
  }

  if (targetConfig.rules === undefined) {
    targetConfig.rules = {};
  }

  for (const [rule, config] of Object.entries(eslintConfig.rules)) {
    const normalizedConfig = normalizeSeverityValue(config);
    const unsupportedRuleMessage = `unsupported rule: ${rule}`;

    // ToDo: check if the rule is really supported by oxlint
    // when not ask the user if this is ok
    // maybe put it still into the jsonc file but commented out

    if (allRules.includes(rule)) {
      if (!options?.withNursery && rules.nurseryRules.includes(rule)) {
        options?.reporter?.report(
          `unsupported rule, but available as a nursery rule: ${rule}`
        );
        continue;
      }

      if (!options?.typeAware && typescriptTypeAwareRules.includes(rule)) {
        options?.reporter?.report(
          `type-aware rule detected, but \`--type-aware\` is not enabled: ${rule}`
        );
        continue;
      }

      if (options?.merge) {
        // when merge, only override if not exists
        // for non merge override it because eslint/typescript rules
        if (!(rule in targetConfig.rules)) {
          targetConfig.rules[rule] = normalizedConfig;
        }
      } else {
        targetConfig.rules[rule] = normalizedConfig;
      }
    } else {
      // For unsupported rules, when jsPlugins is enabled, always try to map
      // them to a JS plugin rule, regardless of severity (including 'off').
      if (options?.jsPlugins) {
        // If the rule is disabled, avoid enabling the jsPlugin to prevent noise.
        if (isOffValue(normalizedConfig)) {
          if (eslintConfig.files === undefined) {
            // base config: drop disabled rule entirely
            delete targetConfig.rules[rule];
          } else {
            // override: keep the disabled setting without adding jsPlugin, unless plugin is ignored
            if (!isIgnoredPluginRule(rule)) {
              targetConfig.rules[rule] = normalizedConfig;
            }
          }
          // also remove any previously queued unsupported report for base
          if (eslintConfig.files === undefined) {
            options.reporter?.remove(unsupportedRuleMessage);
          }
          continue;
        }

        if (enableJsPluginRule(targetConfig, rule, normalizedConfig)) {
          continue;
        }
        // fall through to unsupported handling if plugin couldn't be enabled
      }

      // Non-jsPlugins path or failed jsPlugin mapping: handle disabled rules
      if (!isActiveValue(normalizedConfig)) {
        // if rule is disabled, remove it.
        if (isOffValue(normalizedConfig)) {
          delete targetConfig.rules[rule];
        }
        // only remove the reporter diagnostics when it is in a base config.
        if (eslintConfig.files === undefined) {
          options?.reporter?.remove(unsupportedRuleMessage);
        }
        continue;
      }

      // Active unsupported rule: report
      options?.reporter?.report(unsupportedRuleMessage);
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

  // First pass: merge all overrides with same files pattern
  for (const [_i, override] of config.overrides.entries()) {
    if (override.files === undefined) {
      continue;
    }

    // Merge only consecutive overrides that share the same `files` array.
    // Non-consecutive duplicates should not be merged because intervening
    // overrides might change the effective behavior.
    const overrides = config.overrides;
    const indicesToRemove = new Set<number>();
    for (let i = 0; i < overrides.length; i++) {
      const current = overrides[i];
      if (current.files === undefined) continue;

      let j = i + 1;
      while (
        j < overrides.length &&
        overrides[j].files !== undefined &&
        JSON.stringify(overrides[j].files) === JSON.stringify(current.files)
      ) {
        const other = overrides[j];

        // Merge rules: later overrides win
        if (other.rules) {
          if (!current.rules) current.rules = {};
          Object.assign(current.rules, other.rules);
        }

        // Merge plugins
        if (other.plugins) {
          if (!current.plugins) current.plugins = [];
          current.plugins = [
            ...new Set([...(current.plugins ?? []), ...other.plugins]),
          ];
        }

        // Merge env/globals shallowly
        for (const key of ['env', 'globals'] as const) {
          if ((other as any)[key]) {
            if (!(current as any)[key]) {
              (current as any)[key] = (other as any)[key];
            } else {
              (current as any)[key] = {
                ...(current as any)[key],
                ...(other as any)[key],
              };
            }
          }
        }

        // Clear merged properties on the duplicate so it can be removed later
        for (const prop of Object.keys(other)) {
          // Only delete keys that were merged
          if (['rules', 'plugins', 'env', 'globals'].includes(prop)) {
            delete (other as any)[prop];
          }
        }
        // mark this index for removal
        indicesToRemove.add(j);

        j++;
      }

      // Remove rules that match root config (only when root rules exist)
      if (current.rules && config.rules) {
        for (const [rule, settings] of Object.entries(current.rules)) {
          if (config.rules[rule] === settings) {
            delete current.rules[rule];
          }
        }

        if (Object.keys(current.rules).length === 0) {
          delete current.rules;
        }
      }

      // Skip to the last merged index
      if (j > i + 1) {
        i = j - 1;
      }
    }

    // Remove duplicate overrides which were cleared (only 'files' left)
    if (indicesToRemove.size > 0) {
      config.overrides = config.overrides.filter(
        (_, idx) => !indicesToRemove.has(idx)
      );
    }
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
 * Oxlint support them only under the node plugin name
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

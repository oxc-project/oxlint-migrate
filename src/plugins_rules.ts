import type { Linter } from 'eslint';
import * as rules from './generated/rules.js';
import { Options, OxlintConfig, OxlintConfigOrOverride } from './types.js';
import {
  rulesPrefixesForPlugins,
  typescriptRulesExtendEslintRules,
} from './constants.js';

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

const isErrorValue = (value: unknown) => isValueInSet(value, ['error', 1]);

const isWarnValue = (value: unknown) => isValueInSet(value, ['warn', 2]);

const normalizeSeverityValue = (value: Linter.RuleEntry | undefined) => {
  if (value === undefined) {
    return value;
  }

  if (isWarnValue(value)) {
    if (Array.isArray(value)) {
      value[0] == 'warn';
      return value;
    }

    return 'warn';
  } else if (isErrorValue(value)) {
    if (Array.isArray(value)) {
      value[0] == 'error';
      return value;
    }

    return 'error';
  }

  if (isOffValue(value)) {
    if (Array.isArray(value)) {
      value[0] == 'off';
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
    // ToDo: check if the rule is really supported by oxlint
    // when not ask the user if this is ok
    // maybe put it still into the jsonc file but commented out

    if (allRules.includes(rule)) {
      // ToDo: enable via flag
      if (rules.nurseryRules.includes(rule)) {
        options?.reporter !== undefined &&
          options.reporter(`unsupported rule, but in development: ${rule}`);
        continue;
      }

      // when upgrade only override if not exists
      // for non upgrade override it because eslint/typescript rules
      if (options?.upgrade) {
        if (!(rule in targetConfig.rules)) {
          targetConfig.rules[rule] = normalizeSeverityValue(config);
        }
      } else {
        targetConfig.rules[rule] = normalizeSeverityValue(config);
      }
    } else {
      // ToDo: maybe use a force flag when some enabled rules are detected?
      if (isActiveValue(config)) {
        options?.reporter !== undefined &&
          options.reporter(`unsupported rule: ${rule}`);
      }
    }
  }
};

export const detectNeededRulesPlugins = (
  targetConfig: OxlintConfigOrOverride,
  options?: Options
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

    let found = false;
    for (const [prefix, plugin] of Object.entries(rulesPrefixesForPlugins)) {
      if (rule.startsWith(`${prefix}/`)) {
        if (!targetConfig.plugins.includes(plugin)) {
          targetConfig.plugins.push(plugin);
        }
        found = true;
      }
    }

    if (!found) {
      options?.reporter !== undefined &&
        options.reporter(`unsupported plugin for rule: ${rule}`);
    }
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
  if (config.rules === undefined || config.overrides === undefined) {
    return;
  }

  for (const override of config.overrides) {
    if (override.rules === undefined) {
      continue;
    }

    for (const [rule, settings] of Object.entries(override.rules)) {
      // when they are the same, delete inside override
      if (config.rules[rule] === settings) {
        delete override.rules[rule];
      }
    }

    if (Object.keys(override.rules).length === 0) {
      delete override.rules;
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

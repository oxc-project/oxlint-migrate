import type { Linter } from 'eslint';
import rules from './generated/rules.js';
import { OxlintConfigOrOverride, Reporter } from './types.js';
import { rulesPrefixesForPlugins } from './constants.js';

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

export const transformRuleEntry = (
  eslintConfig: Linter.Config,
  targetConfig: OxlintConfigOrOverride,
  reporter: Reporter
): void => {
  if (eslintConfig.rules == undefined) {
    return;
  }

  if (targetConfig.rules === undefined) {
    targetConfig.rules = {};
  }

  for (const [rule, config] of Object.entries(eslintConfig.rules)) {
    // ToDo: check if the rule is really supported by oxlint
    // when not ask the user if this is ok
    // maybe put it still into the jsonc file but commented out

    // ToDo: typescript uses `ts/no-unused-expressions`. New Namespace?
    // ToDo: maybe if it is nursery
    if (rules.includes(rule)) {
      targetConfig.rules[rule] = config;
    } else {
      // ToDo: maybe use a force flag when some enabled rules are detected?
      if (isActiveValue(config)) {
        reporter !== undefined && reporter(`unsupported rule: ${rule}`);
      }
    }
  }
};

export const detectNeededRulesPlugins = (
  targetConfig: OxlintConfigOrOverride,
  reporter: Reporter
): void => {
  if (targetConfig.rules === undefined) {
    return;
  }

  if (targetConfig.plugins === undefined) {
    targetConfig.plugins = [];
  }

  for (const rule of Object.keys(targetConfig.rules)) {
    // eslint rule has no / prefix and is supported by oxlint out of the box
    if (!rule.includes('/')) {
      continue;
    }

    let found = false;
    for (const [prefix, plugin] of Object.entries(rulesPrefixesForPlugins)) {
      if (
        rule.startsWith(`${prefix}/`) &&
        !targetConfig.plugins.includes(plugin)
      ) {
        targetConfig.plugins.push(plugin);
        found = true;
      }
    }

    if (!found) {
      reporter !== undefined &&
        reporter(`unsupported plugin for rule: ${rule}`);
    }
  }
};

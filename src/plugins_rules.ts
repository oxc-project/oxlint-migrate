import type { Linter } from 'eslint';
import rules from './generated/rules.js';
import { OxlintConfigOrOverride } from './types.js';
import { rulesPrefixesForPlugins } from './constants.js';

export const transformRuleEntry = (
  eslintConfig: Linter.Config,
  targetConfig: OxlintConfigOrOverride,
  unsupportedRules: string[]
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
      // ToDo: only report when enabled
      // maybe use a force flag when some enabled rules are detected?
      unsupportedRules.push(`unsupported rule: ${rule}`);
    }
  }
};

export const detectNeededRulesPlugins = (
  targetConfig: OxlintConfigOrOverride,
  unsupportedPlugins: string[]
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
      if (rule.startsWith(`${prefix}/`)) {
        targetConfig.plugins.push(plugin);
        found = true;
      }
    }

    if (!found) {
      unsupportedPlugins.push(`unsupported plugin for rule: ${rule}`);
    }
  }
};

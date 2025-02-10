import type { Linter } from 'eslint';
import rules from './generated/rules.js';
import { OxlintConfigOrOverride } from './types.js';

export const transformRuleEntry = (
  eslintConfig: Linter.Config,
  targetConfig: OxlintConfigOrOverride,
  unsupportedRules: string[]
) => {
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

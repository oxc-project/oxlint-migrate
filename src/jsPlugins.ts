import { Linter } from 'eslint';
import { rulesPrefixesForPlugins } from './constants.js';
import { OxlintConfigOrOverride } from './types.js';

const ignorePlugins = [
  ...Object.keys(rulesPrefixesForPlugins),
  ...Object.values(rulesPrefixesForPlugins),
  'local', // ToDo: handle local plugin rules
];

export const enableJsPluginRule = (
  eslintConfig: Linter.Config,
  targetConfig: OxlintConfigOrOverride,
  rule: string,
  ruleEntry: Linter.RuleEntry | undefined
): boolean => {
  const [pluginName, ruleName] = rule.split('/', 2);
  if (pluginName === undefined || ruleName === undefined) {
    return false;
  }
  if (ignorePlugins.includes(pluginName)) {
    return false;
  }
  if (targetConfig.jsPlugins === undefined) {
    targetConfig.jsPlugins = [];
  }
  const eslintName = pluginName.startsWith('@')
    ? `${pluginName}/eslint-plugin`
    : `eslint-plugin-${pluginName}`;
  if (!targetConfig.jsPlugins.includes(eslintName)) {
    targetConfig.jsPlugins.push(eslintName);
  }

  targetConfig.rules = targetConfig.rules || {};
  targetConfig.rules[rule] = ruleEntry;
  return true;
};

import { Linter } from 'eslint';
import { rulesPrefixesForPlugins } from './constants.js';
import { OxlintConfigOrOverride } from './types.js';

const ignorePlugins = [
  ...Object.keys(rulesPrefixesForPlugins),
  ...Object.values(rulesPrefixesForPlugins),
  'prefer-let', // not a plugin but a eslint rule `prefer-let/prefer-let`
];

const getPluginNameFromRule = (rule: string): string | undefined => {
  const char = rule.indexOf('/');
  if (char === -1) {
    return undefined;
  }
  return rule.slice(0, char);
};

const collectEsLintPluginNames = (
  eslintConfig: Linter.Config
): [string, string | undefined][] => {
  const pluginNames: [string, string | undefined][] = [];
  if (eslintConfig.plugins) {
    for (const [name, plugin] of Object.entries(eslintConfig.plugins)) {
      pluginNames.push([name, plugin.meta?.name]);
    }
  }
  return pluginNames;
};

export const enableJsPluginRule = (
  eslintConfig: Linter.Config,
  targetConfig: OxlintConfigOrOverride,
  rule: string,
  severity: 'error' | 'warn' | 'off'
): boolean => {
  const pluginName = getPluginNameFromRule(rule);
  if (pluginName === undefined) {
    return false;
  }
  if (ignorePlugins.includes(pluginName)) {
    return false;
  }
  if (targetConfig.jsPlugins === undefined) {
    targetConfig.jsPlugins = [];
  }
  const eslintPlugins = collectEsLintPluginNames(eslintConfig);
  if (eslintPlugins.length) {
    // console.log(eslintPlugins);
  }
  const eslintName = pluginName.startsWith('@')
    ? `${pluginName}/eslint-plugin`
    : `eslint-plugin-${pluginName}`;
  if (!targetConfig.jsPlugins.includes(eslintName)) {
    targetConfig.jsPlugins.push(eslintName);
  }
  if (rule.startsWith('babel')) {
    console.log(rule, severity);
  }
  targetConfig.rules = targetConfig.rules || {};
  targetConfig.rules[rule] = severity;
  return true;
};

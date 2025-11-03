import { Linter } from 'eslint';
import { rulesPrefixesForPlugins } from './constants.js';
import { OxlintConfigOrOverride } from './types.js';

const ignorePlugins = new Set<string>([
  ...Object.keys(rulesPrefixesForPlugins),
  ...Object.values(rulesPrefixesForPlugins),
  'local', // ToDo: handle local plugin rules
]);

const collectEsLintPluginNames = (
  eslintConfig: Linter.Config
): Map<string, string> => {
  const pluginNames = new Map<string, string>();
  if (eslintConfig.plugins) {
    for (const [name, plugin] of Object.entries(eslintConfig.plugins)) {
      if (typeof plugin.meta?.name !== 'string') {
        continue;
      }
      // only meta rules where the plugin name includes 'eslint-plugin'
      // it is not a must for `meta.name` to include 'eslint-plugin', but
      // in practice most plugins follow this convention.
      // `@antfu/eslint-plugin` and `eslint-plugin-unused-imports` is an example that not follows this convention.
      if (!plugin.meta.name.includes('eslint-plugin')) {
        continue;
      }
      pluginNames.set(name, plugin.meta.name);
    }
  }
  return pluginNames;
};

const guessEslintPluginName = (
  eslintConfig: Linter.Config,
  pluginName: string
): string => {
  const eslintPlugins = collectEsLintPluginNames(eslintConfig);

  if (eslintPlugins.has(pluginName)) {
    return eslintPlugins.get(pluginName)!;
  }
  return pluginName.startsWith('@')
    ? `${pluginName}/eslint-plugin`
    : `eslint-plugin-${pluginName}`;
};

export const enableJsPluginRule = (
  eslintConfig: Linter.Config,
  targetConfig: OxlintConfigOrOverride,
  rule: string,
  ruleEntry: Linter.RuleEntry | undefined
): boolean => {
  // the plugin to rule slash separator index is detected by last slash in general.
  // Some eslint plugins have nested names with slashes. (`eslint-plugin-toml`, `node`).
  // We assume the last slash only separates plugin name and rule name when it starts from a namespace.
  const separatorSlash = rule.indexOf('/');

  if (separatorSlash === -1) {
    return false;
  }
  const pluginName = rule.substring(0, separatorSlash);

  if (ignorePlugins.has(pluginName)) {
    return false;
  }
  if (targetConfig.jsPlugins === undefined) {
    targetConfig.jsPlugins = [];
  }

  const eslintPluginName = guessEslintPluginName(eslintConfig, pluginName);

  if (!targetConfig.jsPlugins.includes(eslintPluginName)) {
    targetConfig.jsPlugins.push(eslintPluginName);
  }

  targetConfig.rules = targetConfig.rules || {};
  targetConfig.rules[rule] = ruleEntry;
  return true;
};

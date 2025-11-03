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
  if (pluginName.startsWith('@')) {
    // Scoped plugin. If it contains a sub-id (e.g. @scope/id), map to @scope/eslint-plugin-id
    const [scope, maybeSub] = pluginName.split('/');
    if (maybeSub) {
      return `${scope}/eslint-plugin-${maybeSub}`;
    }
    // Plain scoped plugin (e.g. @stylistic)
    return `${scope}/eslint-plugin`;
  }
  return `eslint-plugin-${pluginName}`;
};

const extractPluginId = (ruleId: string): string | undefined => {
  // ESLint rule ids are either "core" (no slash) or "<plugin>/<rule>".
  // For scoped plugin ids, the plugin id can itself contain a slash, e.g.
  //   @stylistic/ts/member-delimiter-style -> pluginId = @stylistic/ts
  //   @eslint-community/eslint-comments/disable-enable-pair -> pluginId = @eslint-community/eslint-comments
  const firstSlash = ruleId.indexOf('/');
  if (firstSlash === -1) {
    return;
  }

  if (ruleId.startsWith('@')) {
    // Find the second slash which separates pluginId and rule name
    const secondSlash = ruleId.indexOf('/', firstSlash + 1);
    if (secondSlash !== -1) {
      return ruleId.substring(0, secondSlash);
    }
  }

  // Unscoped plugin: pluginId is before the first slash
  return ruleId.substring(0, firstSlash);
};

export const enableJsPluginRule = (
  eslintConfig: Linter.Config,
  targetConfig: OxlintConfigOrOverride,
  rule: string,
  ruleEntry: Linter.RuleEntry | undefined
): boolean => {
  const pluginName = extractPluginId(rule);

  if (pluginName === undefined) {
    return false;
  }

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

import { rulesPrefixesForPlugins } from './constants.js';
import type { ESLint } from './types.js';
import { OxlintConfigOrOverride } from './types.js';

const ignorePlugins = new Set<string>([
  ...Object.keys(rulesPrefixesForPlugins),
  ...Object.values(rulesPrefixesForPlugins),
  'local', // ToDo: handle local plugin rules
]);

const guessEslintPluginName = (pluginName: string): string => {
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

export const isIgnoredPluginRule = (ruleId: string): boolean => {
  const pluginName = extractPluginId(ruleId);
  // Return true because the rule comes from core ESLint, and so
  // should not be considered a plugin rule.
  if (pluginName === undefined) {
    return true;
  }
  return ignorePlugins.has(pluginName);
};

// Enables the given rule in the target configuration, ensuring that the
// corresponding ESLint plugin is included in the `jsPlugins` array.
//
// This will add the jsPlugin if it is not already present.
export const enableJsPluginRule = (
  targetConfig: OxlintConfigOrOverride,
  rule: string,
  ruleEntry: ESLint.RuleConfig | undefined
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

  const eslintPluginName = guessEslintPluginName(pluginName);

  if (!targetConfig.jsPlugins.includes(eslintPluginName)) {
    targetConfig.jsPlugins.push(eslintPluginName);
  }

  targetConfig.rules = targetConfig.rules || {};
  targetConfig.rules[rule] = ruleEntry;
  return true;
};

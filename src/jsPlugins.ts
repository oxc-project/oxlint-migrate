import { rulesPrefixesForPlugins } from './constants.js';
import type { ESLint, OxlintConfigOrOverride } from './types.js';

const ignorePlugins = new Set<string>([
  ...Object.keys(rulesPrefixesForPlugins),
  ...Object.values(rulesPrefixesForPlugins),
  'local', // ToDo: handle local plugin rules
]);

const tryResolvePackage = (packageName: string): boolean => {
  try {
    import.meta.resolve(packageName);
    return true;
  } catch {
    return false;
  }
};

// Cache resolved plugin names to avoid repeated module resolution.
const pluginNameCache = new Map<string, string>();

/**
 * Resolves the npm package name for an ESLint plugin given its scope name.
 *
 * For scoped plugin names (starting with `@`), the mapping is unambiguous:
 *   - `@scope`     -> `@scope/eslint-plugin`
 *   - `@scope/sub` -> `@scope/eslint-plugin-sub`
 *
 * For non-scoped names, the npm package could follow either convention:
 *   - `eslint-plugin-{name}` (e.g. `eslint-plugin-mocha`)
 *   - `@{name}/eslint-plugin` (e.g. `@e18e/eslint-plugin`)
 *
 * We try to resolve both candidates against the installed packages and
 * use the one that is actually present, falling back to the standard
 * `eslint-plugin-{name}` convention when neither can be resolved.
 */
const resolveEslintPluginName = (pluginName: string): string => {
  const cached = pluginNameCache.get(pluginName);
  if (cached !== undefined) {
    return cached;
  }

  let result: string;

  if (pluginName.startsWith('@')) {
    // Scoped plugin. If it contains a sub-id (e.g. @scope/id), map to @scope/eslint-plugin-id
    const [scope, maybeSub] = pluginName.split('/');
    if (maybeSub) {
      result = `${scope}/eslint-plugin-${maybeSub}`;
    } else {
      // Plain scoped plugin (e.g. @stylistic)
      result = `${scope}/eslint-plugin`;
    }
  } else {
    // For non-scoped plugins, try to resolve the actual installed package.
    const standardName = `eslint-plugin-${pluginName}`;
    const scopedName = `@${pluginName}/eslint-plugin`;

    if (tryResolvePackage(standardName)) {
      result = standardName;
    } else if (tryResolvePackage(scopedName)) {
      result = scopedName;
    } else {
      // Neither resolves; fall back to standard convention.
      result = standardName;
    }
  }

  pluginNameCache.set(pluginName, result);
  return result;
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

  const eslintPluginName = resolveEslintPluginName(pluginName);

  if (!targetConfig.jsPlugins.includes(eslintPluginName)) {
    targetConfig.jsPlugins.push(eslintPluginName);
  }

  targetConfig.rules = targetConfig.rules || {};
  targetConfig.rules[rule] = ruleEntry;
  return true;
};

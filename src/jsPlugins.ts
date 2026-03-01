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

/**
 * Derives the npm package name for a plugin from its `meta.name` field.
 *
 * If `meta.name` already looks like a full npm package name (contains
 * "eslint-plugin"), it is returned as-is.  Otherwise it is fed through
 * {@link resolveEslintPluginName} for the usual heuristic resolution.
 */
const resolveFromMetaName = (metaName: string): string => {
  if (metaName.includes('eslint-plugin')) {
    return metaName;
  }
  return resolveEslintPluginName(metaName);
};

/**
 * Derives the rule-ID prefix that an npm package exposes.
 *
 * Examples:
 *   `eslint-plugin-react-dom`        -> `react-dom`
 *   `eslint-plugin-mocha`            -> `mocha`
 *   `@stylistic/eslint-plugin`       -> `@stylistic`
 *   `@stylistic/eslint-plugin-ts`    -> `@stylistic/ts`
 */
const deriveRulePrefix = (packageName: string): string => {
  if (packageName.startsWith('@')) {
    const slashIdx = packageName.indexOf('/');
    const scope = packageName.substring(0, slashIdx);
    const rest = packageName.substring(slashIdx + 1);
    if (rest === 'eslint-plugin') {
      return scope;
    }
    if (rest.startsWith('eslint-plugin-')) {
      return `${scope}/${rest.substring('eslint-plugin-'.length)}`;
    }
    return packageName;
  }
  if (packageName.startsWith('eslint-plugin-')) {
    return packageName.substring('eslint-plugin-'.length);
  }
  return packageName;
};

/**
 * Resolves the canonical rule name for a jsPlugin rule.
 *
 * When a plugin is registered under an alias (e.g. `@eslint-react/dom`) but
 * its `meta.name` reveals a different canonical package (`eslint-plugin-react-dom`),
 * the rule must be rewritten so that oxlint can match it to the loaded plugin.
 *
 * For example:
 *   `@eslint-react/dom/no-find-dom-node` -> `react-dom/no-find-dom-node`
 */
export const resolveJsPluginRuleName = (
  rule: string,
  plugins?: Record<string, ESLint.Plugin> | null
): string => {
  const pluginName = extractPluginId(rule);
  if (pluginName === undefined) {
    return rule;
  }

  const metaName = plugins?.[pluginName]?.meta?.name;
  if (!metaName || !metaName.includes('eslint-plugin')) {
    return rule;
  }

  const canonicalPrefix = deriveRulePrefix(metaName);
  if (canonicalPrefix === pluginName) {
    return rule;
  }

  // Replace the alias prefix with the canonical prefix
  const ruleSuffix = rule.substring(pluginName.length + 1); // +1 for the '/'
  return `${canonicalPrefix}/${ruleSuffix}`;
};

// Enables the given rule in the target configuration, ensuring that the
// corresponding ESLint plugin is included in the `jsPlugins` array.
//
// This will add the jsPlugin if it is not already present.
export const enableJsPluginRule = (
  targetConfig: OxlintConfigOrOverride,
  rule: string,
  ruleEntry: ESLint.RuleConfig | undefined,
  plugins?: Record<string, ESLint.Plugin> | null
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

  // Prefer the plugin's own meta.name when available; fall back to heuristic.
  const metaName = plugins?.[pluginName]?.meta?.name;
  const eslintPluginName = metaName
    ? resolveFromMetaName(metaName)
    : resolveEslintPluginName(pluginName);

  if (!targetConfig.jsPlugins.includes(eslintPluginName)) {
    targetConfig.jsPlugins.push(eslintPluginName);
  }

  // Rewrite the rule name if the plugin is registered under an alias.
  const resolvedRule = resolveJsPluginRuleName(rule, plugins);

  targetConfig.rules = targetConfig.rules || {};
  targetConfig.rules[resolvedRule] = ruleEntry;
  return true;
};

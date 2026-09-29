import type { ExternalPluginEntry } from 'oxlint';
import { rulesPrefixesForPlugins } from './constants.js';
import type {
  ESLint,
  JsPluginSpecifiers,
  OxlintConfigOrOverride,
  OxlintConfigRuleSeverity,
} from './types.js';

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
export const deriveRulePrefix = (packageName: string): string => {
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
 * Plugin namespaces oxlint implements natively in Rust. oxlint rejects a
 * `jsPlugins` entry that claims one of them.
 *
 * @link https://oxc.rs/docs/guide/usage/linter/js-plugins.html
 */
const RESERVED_JS_PLUGIN_NAMESPACES = new Set([
  'eslint',
  'import',
  'jest',
  'jsdoc',
  'jsx-a11y',
  'nextjs',
  'node',
  'oxc',
  'promise',
  'react',
  'react-perf',
  'typescript',
  'unicorn',
  'vitest',
  'vue',
]);

/**
 * Makes a namespace usable for a JS plugin, following the `import` / `import-js`
 * convention from the oxlint docs when it collides with a native Rust plugin.
 */
const asJsPluginNamespace = (namespace: string): string =>
  RESERVED_JS_PLUGIN_NAMESPACES.has(namespace) ? `${namespace}-js` : namespace;

/**
 * The npm package name a plugin reports for itself, if any.
 *
 * `meta.name` is the flat-config convention; plugins that predate it sometimes
 * expose the package name on the plugin root instead. Only accept the latter when
 * it actually looks like a plugin package, so an unrelated `name` property (an
 * ESLint config object nested under `plugins`, say) is not mistaken for one.
 */
const getPluginMetaName = (plugin?: ESLint.Plugin): string | undefined =>
  plugin?.meta?.name ??
  (plugin?.name?.includes('eslint-plugin') ? plugin.name : undefined);

/**
 * The namespace oxlint will address a plugin's rules under.
 *
 * When the plugin's import specifier is known we emit an object entry carrying an
 * explicit `name`, which lets us keep the alias the ESLint config used verbatim so
 * that no rule has to be renamed. Without a specifier the entry is a bare string
 * and oxlint derives the namespace itself, from `meta.namespace` and then
 * `meta.name`, so the rules have to follow that derivation instead.
 *
 * This is the single source of truth for the prefix: both the `jsPlugins` entry and
 * the migrated rule names are built from it, so they cannot drift apart.
 */
const resolveJsPluginNamespace = (
  pluginName: string,
  plugin: ESLint.Plugin | undefined,
  specifiers?: JsPluginSpecifiers
): string => {
  if (plugin !== undefined && specifiers?.get(plugin) !== undefined) {
    return asJsPluginNamespace(pluginName);
  }

  if (plugin?.meta?.namespace) {
    return plugin.meta.namespace;
  }

  const metaName = getPluginMetaName(plugin);
  if (metaName !== undefined && metaName.includes('eslint-plugin')) {
    return deriveRulePrefix(metaName);
  }

  return pluginName;
};

/** Identity of a `jsPlugins` entry, used to de-duplicate the list. */
const jsPluginKey = (entry: ExternalPluginEntry): string =>
  typeof entry === 'string' ? entry : `${entry.name}\u0000${entry.specifier}`;

/**
 * Unions `jsPlugins` lists, de-duplicating entries.
 *
 * Object entries are compared by value; a plain `Set` would keep duplicates of them
 * because every entry is a fresh object.
 */
export const mergeJsPlugins = (
  ...lists: (ExternalPluginEntry[] | null | undefined)[]
): ExternalPluginEntry[] => {
  const byKey = new Map<string, ExternalPluginEntry>();
  for (const list of lists) {
    for (const entry of list ?? []) {
      const key = jsPluginKey(entry);
      if (!byKey.has(key)) {
        byKey.set(key, entry);
      }
    }
  }
  return [...byKey.values()];
};

/**
 * Resolves the rule name oxlint will know a jsPlugin rule under.
 *
 * When the plugin's specifier is known the ESLint alias is kept and the rule is
 * returned unchanged. Otherwise the entry is a bare package name and oxlint derives
 * the namespace from the plugin, so an aliased plugin (e.g. `@eslint-react/dom`
 * whose `meta.name` is `eslint-plugin-react-dom`) needs its rules rewritten to
 * match:
 *   `@eslint-react/dom/no-find-dom-node` -> `react-dom/no-find-dom-node`
 */
export const resolveJsPluginRuleName = (
  rule: string,
  plugins?: Record<string, ESLint.Plugin> | null,
  specifiers?: JsPluginSpecifiers
): string => {
  const pluginName = extractPluginId(rule);
  if (pluginName === undefined) {
    return rule;
  }

  const namespace = resolveJsPluginNamespace(
    pluginName,
    plugins?.[pluginName],
    specifiers
  );
  if (namespace === pluginName) {
    return rule;
  }

  // Replace the alias prefix with the namespace oxlint will use
  const ruleSuffix = rule.substring(pluginName.length + 1); // +1 for the '/'
  return `${namespace}/${ruleSuffix}`;
};

// Enables the given rule in the target configuration, ensuring that the
// corresponding ESLint plugin is included in the `jsPlugins` array.
//
// This will add the jsPlugin if it is not already present.
export const enableJsPluginRule = (
  targetConfig: OxlintConfigOrOverride,
  rule: string,
  ruleEntry: OxlintConfigRuleSeverity | undefined,
  plugins?: Record<string, ESLint.Plugin> | null,
  specifiers?: JsPluginSpecifiers
): boolean => {
  const pluginName = extractPluginId(rule);

  if (pluginName === undefined) {
    return false;
  }

  if (ignorePlugins.has(pluginName)) {
    return false;
  }

  targetConfig.jsPlugins ??= [];

  const plugin = plugins?.[pluginName];
  const specifier = plugin === undefined ? undefined : specifiers?.get(plugin);

  let entry: ExternalPluginEntry;
  if (specifier === undefined) {
    // Nothing tells us where the plugin was imported from, so guess the npm
    // package name and let oxlint derive the namespace from the package itself.
    const metaName = getPluginMetaName(plugin);
    entry = metaName
      ? resolveFromMetaName(metaName)
      : resolveEslintPluginName(pluginName);
  } else {
    // The specifier is known, so the plugin can be registered under the very
    // alias the ESLint config used and its rules can stay as they are.
    entry = {
      name: resolveJsPluginNamespace(pluginName, plugin, specifiers),
      specifier,
    };
  }

  const key = jsPluginKey(entry);
  if (
    !targetConfig.jsPlugins.some((existing) => jsPluginKey(existing) === key)
  ) {
    targetConfig.jsPlugins.push(entry);
  }

  // Rewrite the rule name if the plugin is registered under an alias.
  const resolvedRule = resolveJsPluginRuleName(rule, plugins, specifiers);

  targetConfig.rules = targetConfig.rules ?? {};
  targetConfig.rules[resolvedRule] = ruleEntry!; // TODO: handle undefined ruleEntry if needed
  return true;
};

/**
 * Returns true if any rule name matches the given jsPlugin package.
 *
 * Handles aliased plugins where the ESLint registration name differs from the
 * canonical prefix derived from the npm package name:
 *  - `@e18e/eslint-plugin` → prefix `@e18e`, but rules may use `e18e/`
 *  - `@eslint/eslint-plugin-markdown` → prefix `@eslint/markdown`, but rules
 *    may use `markdown/`
 */
const hasRulesForPlugin = (
  ruleNames: string[],
  pluginPackage: string
): boolean => {
  const prefix = deriveRulePrefix(pluginPackage);
  if (ruleNames.some((rule) => rule.startsWith(`${prefix}/`))) {
    return true;
  }
  // When the derived prefix is scoped, the plugin may have been registered
  // without the scope in the ESLint config:
  //   `@scope`      → also check `scope/`
  //   `@scope/name` → also check `name/`
  if (prefix.startsWith('@')) {
    const slashIdx = prefix.indexOf('/');
    const unscoped =
      slashIdx === -1 ? prefix.substring(1) : prefix.substring(slashIdx + 1);
    return ruleNames.some((rule) => rule.startsWith(`${unscoped}/`));
  }
  return false;
};

/**
 * Removes jsPlugin entries that have no corresponding rules left in the config.
 *
 * This can happen when an earlier ESLint config enables a plugin rule (adding the
 * jsPlugin) but a later config (e.g. eslint-config-prettier) turns all of that
 * plugin's rules off (deleting them from the rules object).
 */
export const cleanUpUnusedJsPlugins = (
  config: OxlintConfigOrOverride
): void => {
  if (
    config.jsPlugins === undefined ||
    config.jsPlugins === null ||
    config.jsPlugins.length === 0
  ) {
    return;
  }

  const ruleNames = Object.keys(config.rules ?? {});

  config.jsPlugins = config.jsPlugins.filter((entry) =>
    // An object entry states its namespace, so the match is exact. A string entry
    // only carries the package name and oxlint derives the namespace from the
    // plugin itself, which we cannot see here, hence the heuristic.
    typeof entry === 'string'
      ? hasRulesForPlugin(ruleNames, entry)
      : ruleNames.some((rule) => rule.startsWith(`${entry.name}/`))
  );

  if (config.jsPlugins.length === 0) {
    delete config.jsPlugins;
  }
};

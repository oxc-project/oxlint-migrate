import { existsSync } from 'node:fs';
import * as nodeModule from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { JsPluginSpecifiers } from '../src/types.js';

// @link <https://github.com/eslint/eslint/blob/5fd211d00b6f0fc58cf587196a432325b7b88ec2/lib/config/config-loader.js#L40-L47>
const FLAT_CONFIG_FILENAMES = [
  'eslint.config.js',
  'eslint.config.mjs',
  'eslint.config.cjs',
  'eslint.config.ts',
  'eslint.config.mts',
  'eslint.config.cts',
];

/** Extensions a JS/TS module can have. Anything else cannot be a plugin. */
const MODULE_EXTENSIONS = new Set([
  '.js',
  '.mjs',
  '.cjs',
  '.jsx',
  '.ts',
  '.mts',
  '.cts',
  '.tsx',
]);

export type LoadedESLintConfig = {
  /** The module namespace of the imported ESLint config. */
  config: any;
  /** Import specifiers for the ESLint plugins the config pulled in. */
  pluginSpecifiers: JsPluginSpecifiers;
};

export type LoadESLintConfigOptions = {
  /**
   * Whether to trace plugin imports. Skipped when `--js-plugins=false`, since the
   * specifiers are then never read and tracing costs an extra pass over the
   * config's module graph.
   *
   * Defaults to `true`.
   */
  collectPluginSpecifiers?: boolean;
  /**
   * Directory the emitted `.oxlintrc.json` will live in. Plugins that are not npm
   * packages get a specifier relative to it, because oxlint resolves `jsPlugins`
   * paths relative to the config file that lists them.
   *
   * Defaults to the directory of the ESLint config.
   */
  specifierBaseDir?: string;
};

export const getAutodetectedEslintConfigName = (
  cwd: string
): string | undefined => {
  for (const filename of FLAT_CONFIG_FILENAMES) {
    const filePath = path.join(cwd, filename);
    if (existsSync(filePath)) {
      return filePath;
    }
  }
};

/**
 * A specifier is "bare" when it names a package rather than a file, which is the
 * form we want in `jsPlugins` whenever it is available: it stays valid no matter
 * where the oxlint config ends up. Subpath imports (`#internal/plugin`) are
 * excluded because they only resolve from inside their own package.
 */
const isBareSpecifier = (specifier: string): boolean =>
  !specifier.startsWith('.') &&
  !specifier.startsWith('/') &&
  !specifier.startsWith('#') &&
  !/^[a-z][a-z\d+\-.]*:/i.test(specifier);

/** Turns a module path into a relative specifier oxlint can resolve from `baseDir`. */
const toRelativeSpecifier = (
  filePath: string,
  baseDir: string
): string | undefined => {
  const relative = path.relative(baseDir, filePath).split(path.sep).join('/');
  if (relative === '') {
    return undefined;
  }

  return relative.startsWith('.') ? relative : `./${relative}`;
};

/**
 * Name of the package a file inside `node_modules` belongs to.
 *
 * The last `node_modules` segment is the relevant one: pnpm stores real packages
 * under `node_modules/.pnpm/<pkg>@<version>_<hash>/node_modules/<pkg>/`.
 */
const packageNameFromPath = (filePath: string): string | undefined => {
  const segments = filePath.split(path.sep);
  const index = segments.lastIndexOf('node_modules');
  if (index === -1) {
    return undefined;
  }

  const [first, second] = segments.slice(index + 1);
  if (first === undefined) {
    return undefined;
  }
  if (!first.startsWith('@')) {
    return first;
  }
  return second === undefined ? undefined : `${first}/${second}`;
};

/** `eslint-plugin-x`, `@scope/eslint-plugin` or `@scope/eslint-plugin-x`. */
const isEslintPluginPackageName = (packageName: string): boolean =>
  /^(@[^/]+\/)?eslint-plugin(-|$)/.test(packageName);

/**
 * Picks the specifier to write into `jsPlugins` for a module.
 *
 * A module can be reached through several specifiers (a package name and a
 * self-referencing relative import, for instance). Package names win, the shortest
 * one first so `eslint-plugin-x` beats `eslint-plugin-x/dist/index.js`, and ties are
 * broken alphabetically to keep the generated config stable across runs.
 *
 * A module inside `node_modules` never gets a path: those paths are unstable (pnpm
 * puts the version and a hash in them) and break on the next install. It falls back
 * to the package name, and only when the package is itself an ESLint plugin, so that
 * importing the package really does yield this plugin. Anything else returns
 * `undefined` and is left to the package-name heuristic in `src/jsPlugins.ts`.
 */
const pickSpecifier = (
  specifiers: Iterable<string>,
  filePath: string,
  baseDir: string
): string | undefined => {
  const bare = [...specifiers].filter(isBareSpecifier);
  if (bare.length > 0) {
    return bare.sort((a, b) => a.length - b.length || a.localeCompare(b))[0];
  }

  const packageName = packageNameFromPath(filePath);
  if (packageName !== undefined) {
    return isEslintPluginPackageName(packageName) ? packageName : undefined;
  }

  return toRelativeSpecifier(filePath, baseDir);
};

/**
 * Plugins are the only exports we care about, and requiring a `rules` record keeps
 * the map small enough that unrelated modules cannot collide in it — notably every
 * module without a default export, which would otherwise all share the key
 * `undefined`.
 */
const isPluginLike = (value: unknown): boolean =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as { rules?: unknown }).rules === 'object' &&
  (value as { rules?: unknown }).rules !== null;

/**
 * The values of a module an ESLint config could pass as a plugin *and* that oxlint
 * would get back when it loads the same specifier.
 *
 * Deliberately shallow. Plugins also hide inside a package's own configs (
 * `reactRefresh.configs.recommended.plugins['react-refresh']`,
 * `eslintReact.configs.all.plugins['@eslint-react/dom']`), but those are separate
 * objects that importing the package does not yield, so pointing a `jsPlugins`
 * entry at the package would register the wrong plugin. Named exports are skipped
 * for the same reason: oxlint loads a plugin's default export.
 */
const pluginCandidates = (namespace: Record<string, unknown>): unknown[] => [
  // `import * as plugin from '...'` hands the namespace itself to `plugins`.
  namespace,
  namespace.default,
];

/**
 * Records where each module of the ESLint config's dependency graph was imported
 * from, so plugin objects can be traced back to an import specifier afterwards.
 *
 * `module.registerHooks` is only available on Node >= 22.15; elsewhere (older Node,
 * Deno, Bun) migration still works, it just falls back to guessing package names
 * from rule prefixes.
 *
 * Only a `resolve` hook is installed. A `load` hook would tell us which modules were
 * really evaluated, but it breaks the `--import @oxc-node/core/register` setup the
 * README recommends for TypeScript configs on older Node: chaining a synchronous
 * `load` hook onto that async loader makes the import fail with "Expected a string,
 * an ArrayBuffer, or a TypedArray to be returned".
 */
const recordModuleResolutions = (): {
  specifiersByUrl: Map<string, Set<string>>;
  stop: () => void;
} => {
  const specifiersByUrl = new Map<string, Set<string>>();

  if (typeof nodeModule.registerHooks !== 'function') {
    return { specifiersByUrl, stop: () => {} };
  }

  const hooks = nodeModule.registerHooks({
    resolve(specifier, context, nextResolve) {
      const result = nextResolve(specifier, context);
      const specifiers = specifiersByUrl.get(result.url);
      if (specifiers === undefined) {
        specifiersByUrl.set(result.url, new Set([specifier]));
      } else {
        specifiers.add(specifier);
      }
      return result;
    },
  });

  return { specifiersByUrl, stop: () => hooks.deregister() };
};

/**
 * Maps the plugin objects the ESLint config exposes back to the specifier they were
 * imported with.
 *
 * Re-importing is what makes the mapping possible: the resolve hook only sees
 * specifiers and URLs, never the objects a module evaluates to. Practically every
 * module here was already evaluated while the config was loading, so the imports
 * come from the module cache and nothing runs twice. A module the config merely
 * resolved without importing (`import.meta.resolve` for a feature check) would be
 * evaluated here; that is the price of not being able to install a `load` hook.
 */
const collectPluginSpecifiers = async (
  specifiersByUrl: Map<string, Set<string>>,
  baseDir: string
): Promise<JsPluginSpecifiers> => {
  const candidateUrls = [...specifiersByUrl.keys()].filter(
    (url) =>
      url.startsWith('file:') &&
      MODULE_EXTENSIONS.has(path.extname(new URL(url).pathname).toLowerCase())
  );

  const namespaces = await Promise.all(
    candidateUrls.map((url) =>
      import(url)
        .then((namespace) => [url, namespace] as const)
        .catch(() => undefined)
    )
  );

  const specifiers = new Map<unknown, string>();
  for (const entry of namespaces) {
    if (entry === undefined) {
      continue;
    }
    const [url, namespace] = entry;
    const specifier = pickSpecifier(
      specifiersByUrl.get(url) ?? [],
      fileURLToPath(url),
      baseDir
    );
    if (specifier === undefined) {
      continue;
    }

    for (const candidate of pluginCandidates(namespace)) {
      // The first specifier wins: a plugin re-exported by several modules keeps the
      // one closest to how it is normally imported.
      if (isPluginLike(candidate) && !specifiers.has(candidate)) {
        specifiers.set(candidate, specifier);
      }
    }
  }

  return specifiers;
};

export const loadESLintConfig = async (
  filePath: string,
  options?: LoadESLintConfigOptions
): Promise<LoadedESLintConfig> => {
  // report when json file is found
  if (filePath.endsWith('json')) {
    throw new Error(
      `json format is not supported. @oxlint/migrate only supports the eslint flat configuration`
    );
  }

  // windows allows only file:// prefix to be imported, reported Error:
  // Only URLs with a scheme in: file, data, and node are supported by the default ESM loader. On Windows, absolute paths must be valid file:// URLs. Received protocol 'c:'
  let url = pathToFileURL(filePath).toString();

  // report when file does not exists
  if (!existsSync(filePath)) {
    throw new Error(`eslint config file not found: ${filePath}`);
  }

  const collect = options?.collectPluginSpecifiers ?? true;
  const { specifiersByUrl, stop } = collect
    ? recordModuleResolutions()
    : { specifiersByUrl: new Map<string, Set<string>>(), stop() {} };

  // TypeScript files are supported in the following environments:
  // - Bun and Deno: TypeScript is natively supported
  // - Node.js >=22.18.0: type-stripping is enabled by default
  // - Node.js >=22.6.0: use NODE_OPTIONS=--experimental-strip-types
  // - Node.js <22.6.0: use NODE_OPTIONS=--import @oxc-node/core/register (requires @oxc-node/core as dev dependency)
  // See: https://nodejs.org/en/learn/typescript/run-natively
  // If the environment is not properly configured, the runtime will throw an error when trying to import the TypeScript file
  let config;
  try {
    config = await import(url);
  } finally {
    // Always unhook, otherwise a failing config would leave the hooks installed
    // for the rest of the process.
    stop();
  }

  const pluginSpecifiers = collect
    ? await collectPluginSpecifiers(
        specifiersByUrl,
        options?.specifierBaseDir ?? path.dirname(filePath)
      )
    : new Map<unknown, string>();

  return { config, pluginSpecifiers };
};

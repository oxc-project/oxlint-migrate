import path from 'node:path';
import { beforeAll, describe, expect, test } from 'vitest';
import { loadESLintConfig } from './config-loader.js';

// These tests import real fixture projects through Node's own module resolution,
// which is what `loadESLintConfig` traces. `vitest.config.ts` externalises
// `integration_test/fixtures` so Vite does not inline them and break the tracing.
//
// Every fixture config is loaded exactly once: Node caches module resolutions per
// importer, so a second load of the same config never reaches the resolve hook and
// would report no specifiers. That is fine for the CLI, which loads one config and
// exits, but it means the tests have to share their loads.
const fixtureDir = path.join(
  import.meta.dirname,
  '../integration_test/fixtures/js-plugin-specifiers'
);

const load = (relativePath: string, specifierBaseDir = fixtureDir) =>
  loadESLintConfig(path.join(fixtureDir, relativePath), { specifierBaseDir });

/** The `plugins` records of a fixture config, merged and keyed by alias. */
const pluginsOf = (config: any): Record<string, unknown> =>
  Object.assign({}, ...config.default.map((entry: any) => entry.plugins ?? {}));

describe('loadESLintConfig plugin specifiers', () => {
  let plugins: Record<string, unknown>;
  let specifiers: ReadonlyMap<unknown, string>;

  beforeAll(async () => {
    const loaded = await load('eslint.config.mjs');
    plugins = pluginsOf(loaded.config);
    specifiers = loaded.pluginSpecifiers;
  });

  test('maps npm plugins to their package name', () => {
    expect(specifiers.get(plugins.regexp)).toBe('eslint-plugin-regexp');
    expect(specifiers.get(plugins['@stylistic'])).toBe(
      '@stylistic/eslint-plugin'
    );
    // Registered under an alias, which must not change the specifier.
    expect(specifiers.get(plugins.moka)).toBe('eslint-plugin-mocha');
  });

  test('maps local plugins to a path relative to the output directory', () => {
    expect(specifiers.get(plugins.mylocal)).toBe('./plugins/named.js');
    expect(specifiers.get(plugins.anon)).toBe('./plugins/anonymous.js');
  });

  test('has no specifier for a plugin built inside the config file', () => {
    expect(specifiers.get(plugins.inline)).toBeUndefined();
  });

  test('never points at a path inside node_modules', () => {
    for (const specifier of specifiers.values()) {
      expect(specifier).not.toContain('node_modules');
    }
  });

  test('rebases local plugins when the config is not next to the output', async () => {
    // The config imports `../plugins/named.js`, but the `.oxlintrc.json` is written
    // one directory up, so the specifier has to be rewritten for that directory.
    const loaded = await load('nested/eslint.config.mjs');

    expect(loaded.pluginSpecifiers.get(pluginsOf(loaded.config).mylocal)).toBe(
      './plugins/named.js'
    );
  });

  test('collects nothing when tracing is turned off', async () => {
    const loaded = await loadESLintConfig(
      path.join(fixtureDir, 'disabled/eslint.config.mjs'),
      { collectPluginSpecifiers: false, specifierBaseDir: fixtureDir }
    );

    expect(loaded.pluginSpecifiers.size).toBe(0);
    // The config itself is still loaded.
    expect(loaded.config.default).toHaveLength(1);
  });

  test('reports the error of a config that throws', async () => {
    await expect(load('throwing/eslint.config.mjs')).rejects.toThrow(
      'fixture config failed to load'
    );
  });
});

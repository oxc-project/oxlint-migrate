import { describe, expect, test } from 'vitest';
import migrateConfig from '../../src/index.js';

import { defineConfig } from 'eslint/config';
import jsdocPlugin from 'eslint-plugin-jsdoc';

const jsPluginEntry = {
  name: 'jsdoc-js',
  specifier: 'eslint-plugin-jsdoc',
};

// Base enabled, override off.
const firstEslintConfig = defineConfig([
  {
    plugins: { jsdoc: jsdocPlugin },
    rules: {
      'jsdoc/check-alignment': 'error',
    },
  },
  {
    plugins: { jsdoc: jsdocPlugin },
    files: ['**/*.js'],
    rules: {
      'jsdoc/check-alignment': 'off',
    },
  },
]);

// Base off, override enabled.
const secondEslintConfig = defineConfig([
  {
    plugins: { jsdoc: jsdocPlugin },
    rules: {
      'jsdoc/check-alignment': 'off',
    },
  },
  {
    plugins: { jsdoc: jsdocPlugin },
    files: ['**/*.js'],
    rules: {
      'jsdoc/check-alignment': 'error',
    },
  },
]);

describe('JS Plugins: native plugin rules with overrides', () => {
  test('base enabled + override off', async () => {
    const oxlintConfig = await migrateConfig(firstEslintConfig, undefined, {
      jsPlugins: true,
    });

    expect(oxlintConfig.rules?.['jsdoc-js/check-alignment']).toBe('error');
    expect(oxlintConfig.rules?.['jsdoc/check-alignment']).toBeUndefined();
    expect(oxlintConfig.jsPlugins).toStrictEqual([jsPluginEntry]);

    const overrides = oxlintConfig.overrides!;
    expect(overrides).toHaveLength(1);
    expect(overrides[0].jsPlugins).toStrictEqual([jsPluginEntry]);
    expect(overrides[0].rules?.['jsdoc-js/check-alignment']).toBe('off');
    expect(overrides[0].rules?.['jsdoc/check-alignment']).toBeUndefined();
  });

  test('base off + override enabled', async () => {
    const oxlintConfig = await migrateConfig(secondEslintConfig, undefined, {
      jsPlugins: true,
    });

    // Base was off, so rule is deleted from base config.
    expect(oxlintConfig.rules?.['jsdoc-js/check-alignment']).toBeUndefined();
    expect(oxlintConfig.rules?.['jsdoc/check-alignment']).toBeUndefined();
    expect(oxlintConfig.jsPlugins).toBeUndefined();

    const overrides = oxlintConfig.overrides!;
    expect(overrides).toHaveLength(1);
    expect(overrides[0].jsPlugins).toStrictEqual([jsPluginEntry]);
    expect(overrides[0].rules?.['jsdoc-js/check-alignment']).toBe('error');
    expect(overrides[0].rules?.['jsdoc/check-alignment']).toBeUndefined();
  });
});

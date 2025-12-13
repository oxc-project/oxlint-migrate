import { describe, expect, test } from 'vitest';
import migrateConfig from '../../src/index.js';

import { defineConfig } from 'eslint/config';
import regexpPlugin from 'eslint-plugin-regexp';

// ESLint config to test that error rules with overrides to turn them off are migrated correctly.
const firstEslintConfig = defineConfig([
  {
    plugins: { regexp: regexpPlugin },
    rules: {
      'regexp/no-lazy-ends': ['error', { ignorePartial: false }],
    },
  },
  {
    plugins: { regexp: regexpPlugin },
    files: ['**/*.js'],
    rules: {
      'regexp/no-lazy-ends': 'off',
    },
  },
]);

// ESLint config to test that disabled rules with overrides to turn them to error are migrated correctly.
const secondEslintConfig = defineConfig([
  {
    plugins: { regexp: regexpPlugin },
    rules: {
      'regexp/no-lazy-ends': 'off',
    },
  },
  {
    plugins: { regexp: regexpPlugin },
    files: ['**/*.js'],
    rules: {
      'regexp/no-lazy-ends': ['error', { ignorePartial: false }],
    },
  },
]);

describe('JS Plugins with overrides', () => {
  test('should migrate first config correctly', async () => {
    const oxlintConfig = await migrateConfig(firstEslintConfig, undefined, {
      jsPlugins: true,
    });

    // Should have the first rule set to error.
    expect(oxlintConfig.rules?.['regexp/no-lazy-ends']).toStrictEqual([
      'error',
      { ignorePartial: false },
    ]);
    expect(oxlintConfig.overrides).toBeDefined();
    expect(oxlintConfig.jsPlugins).toStrictEqual(['eslint-plugin-regexp']);

    // The override should still be present, should only have one.
    const overrides = oxlintConfig.overrides!;
    expect(overrides).toHaveLength(1);
    // jsPlugins is unnecessary in the override since it's already set in the base config.
    expect(overrides[0].jsPlugins).toBeUndefined();

    // Should be set to off in the override.
    expect(overrides[0].rules?.['regexp/no-lazy-ends']).toBe('off');
  });

  test('should migrate second config correctly', async () => {
    const oxlintConfig = await migrateConfig(secondEslintConfig, undefined, {
      jsPlugins: true,
    });

    // Should have the first rule unset. It was set to `off` in the base config, and could be safely removed.
    expect(oxlintConfig.rules?.['regexp/no-lazy-ends']).toBeUndefined();
    expect(oxlintConfig.overrides).toBeDefined();
    expect(oxlintConfig.jsPlugins).toBeUndefined();

    // The override should still be present, should only have one.
    const overrides = oxlintConfig.overrides!;
    expect(overrides).toHaveLength(1);
    expect(overrides[0].jsPlugins).toStrictEqual(['eslint-plugin-regexp']);

    // Should be set to error in the override.
    expect(overrides[0].rules?.['regexp/no-lazy-ends']).toStrictEqual([
      'error',
      { ignorePartial: false },
    ]);
  });
});

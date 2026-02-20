import { describe, expect, test } from 'vitest';
import migrateConfig from '../../src/index.js';

import type { Linter } from 'eslint';

// ESLint config with an unsupported core rule enabled in base, disabled in override.
const firstEslintConfig: Linter.Config[] = [
  {
    rules: {
      'no-restricted-syntax': ['error', 'WithStatement'],
    },
  },
  {
    files: ['**/*.test.js'],
    rules: {
      'no-restricted-syntax': 'off',
    },
  },
];

// ESLint config with an unsupported core rule disabled in base, enabled in override.
const secondEslintConfig: Linter.Config[] = [
  {
    rules: {
      'no-restricted-syntax': 'off',
    },
  },
  {
    files: ['**/*.test.js'],
    rules: {
      'no-restricted-syntax': ['error', 'WithStatement'],
    },
  },
];

describe('JS Plugins with core ESLint rules', () => {
  test('core rule enabled in base, disabled in override', async () => {
    const oxlintConfig = await migrateConfig(firstEslintConfig, undefined, {
      jsPlugins: true,
    });

    expect(
      oxlintConfig.rules?.['eslint-js/no-restricted-syntax']
    ).toStrictEqual(['error', 'WithStatement']);
    expect(oxlintConfig.rules?.['no-restricted-syntax']).toBeUndefined();
    expect(oxlintConfig.jsPlugins).toStrictEqual([
      { name: 'eslint-js', specifier: '@oxlint/plugin-eslint' },
    ]);

    const overrides = oxlintConfig.overrides!;
    expect(overrides).toHaveLength(1);
    expect(overrides[0].rules?.['eslint-js/no-restricted-syntax']).toBe('off');
    expect(overrides[0].rules?.['no-restricted-syntax']).toBeUndefined();
  });

  test('core rule disabled in base, enabled in override', async () => {
    const oxlintConfig = await migrateConfig(secondEslintConfig, undefined, {
      jsPlugins: true,
    });

    expect(
      oxlintConfig.rules?.['eslint-js/no-restricted-syntax']
    ).toBeUndefined();
    expect(oxlintConfig.rules?.['no-restricted-syntax']).toBeUndefined();
    expect(oxlintConfig.jsPlugins).toBeUndefined();

    const overrides = oxlintConfig.overrides!;
    expect(overrides).toHaveLength(1);
    expect(overrides[0].jsPlugins).toStrictEqual([
      { name: 'eslint-js', specifier: '@oxlint/plugin-eslint' },
    ]);
    expect(
      overrides[0].rules?.['eslint-js/no-restricted-syntax']
    ).toStrictEqual(['error', 'WithStatement']);
  });
});

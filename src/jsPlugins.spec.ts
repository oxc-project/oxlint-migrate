import { describe, expect, test } from 'vitest';
import { enableJsPluginRule } from './jsPlugins.js';
import { Linter } from 'eslint';
import { OxlintConfigOrOverride } from './types.js';

describe('enableJsPluginRule', () => {
  const rules = [
    {
      eslintRule: '@stylistic/indent',
      plugin: '@stylistic/eslint-plugin',
      oxlintRule: '@stylistic/indent',
    },
    {
      eslintRule: '@stylistic/ts/member-delimiter-style',
      plugin: '@stylistic/eslint-plugin-ts',
      oxlintRule: '@stylistic/ts/member-delimiter-style',
    },
    {
      eslintRule: 'tsdoc/syntax',
      plugin: 'eslint-plugin-tsdoc',
      oxlintRule: 'tsdoc/syntax',
    },
    {
      eslintRule: 'mocha/no-pending-tests',
      plugin: 'eslint-plugin-mocha',
      oxlintRule: 'mocha/no-pending-tests',
    },
    {
      eslintRule: 'perfectionist/sort-exports',
      plugin: 'eslint-plugin-perfectionist',
      oxlintRule: 'perfectionist/sort-exports',
    },
    {
      eslintRule: '@eslint-community/eslint-comments/disable-enable-pair',
      plugin: '@eslint-community/eslint-plugin-eslint-comments',
      oxlintRule: '@eslint-community/eslint-comments/disable-enable-pair',
    },
  ];

  for (const { eslintRule, plugin, oxlintRule, eslintPlugins } of rules) {
    test(`should enable js plugin ${plugin} rule for ${eslintRule}`, () => {
      const eslintConfig: Linter.Config = {
        plugins: eslintPlugins,
        rules: {
          [eslintRule]: 'error',
        },
      };
      const targetConfig: OxlintConfigOrOverride = {};

      const result = enableJsPluginRule(
        eslintConfig,
        targetConfig,
        eslintRule,
        'error'
      );

      expect(result).toBe(true);
      expect(targetConfig.jsPlugins).toContain(plugin);
      expect(targetConfig.rules?.[oxlintRule]).toBe('error');
    });
  }

  test('should return false for ignored plugins', () => {
    const eslintConfig: Linter.Config = {
      rules: {
        '@typescript-eslint/no-unused-vars': 'warn',
      },
    };
    const targetConfig: OxlintConfigOrOverride = {};
    const result = enableJsPluginRule(
      eslintConfig,
      targetConfig,
      '@typescript-eslint/no-unused-vars',
      'warn'
    );

    expect(result).toBe(false);
    expect(targetConfig.jsPlugins).toBeUndefined();
    expect(targetConfig.rules).toBeUndefined();
  });
});

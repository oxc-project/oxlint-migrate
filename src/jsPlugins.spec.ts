import { describe, expect, test } from 'vitest';
import { enableJsPluginRule } from './jsPlugins.js';
import { Linter } from 'eslint';
import { OxlintConfigOrOverride } from './types.js';

describe('enableJsPluginRule', () => {
  const rules = [
    {
      eslintRule: '@stylistic/indent',
      plugin: '@stylistic/eslint-plugin',
      oxlintRule: '@stylistic/eslint-plugin/indent',
    },
    {
      eslintRule: 'tsdoc/syntax',
      plugin: 'eslint-plugin-tsdoc',
      oxlintRule: 'eslint-plugin-tsdoc/syntax',
    },
    {
      eslintRule: 'mocha/no-pending-tests',
      plugin: 'eslint-plugin-mocha',
      oxlintRule: 'eslint-plugin-mocha/no-pending-tests',
    },
    {
      eslintRule: 'perfectionist/sort-exports',
      plugin: 'eslint-plugin-perfectionist',
      oxlintRule: 'eslint-plugin-perfectionist/sort-exports',
    },
  ];

  for (const { eslintRule: rule, plugin, oxlintRule } of rules) {
    test(`should enable js plugin ${plugin} rule for ${rule}`, () => {
      const eslintConfig: Linter.Config = {
        rules: {
          [rule]: 'error',
        },
      };
      const targetConfig: OxlintConfigOrOverride = {};

      const result = enableJsPluginRule(
        eslintConfig,
        targetConfig,
        rule,
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

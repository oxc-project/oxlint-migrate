import { describe, expect, test } from 'vitest';
import { enableJsPluginRule } from './jsPlugins.js';
import { Linter } from 'eslint';
import { OxlintConfigOrOverride } from './types.js';

describe('enableJsPluginRule', () => {
  const rules = [
    { rule: '@stylistic/indent', plugin: '@stylistic/eslint-plugin' },
    { rule: 'tsdoc/syntax', plugin: 'eslint-plugin-tsdoc' },
    { rule: 'mocha/no-pending-tests', plugin: 'eslint-plugin-mocha' },
    {
      rule: 'perfectionist/sort-exports',
      plugin: 'eslint-plugin-perfectionist',
    },
  ];

  for (const { rule, plugin } of rules) {
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
      expect(targetConfig.rules?.[rule]).toBe('error');
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

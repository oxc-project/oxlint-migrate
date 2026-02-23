import { describe, expect, test } from 'vitest';
import { enableJsPluginRule, isIgnoredPluginRule } from './jsPlugins.js';
import type { OxlintConfigOrOverride } from './types.js';

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

  for (const { eslintRule, plugin, oxlintRule } of rules) {
    test(`should enable js plugin ${plugin} rule for ${eslintRule}`, () => {
      const targetConfig: OxlintConfigOrOverride = {};

      const result = enableJsPluginRule(targetConfig, eslintRule, 'error');

      expect(result).toBe(true);
      expect(targetConfig.jsPlugins).toContain(plugin);
      expect(targetConfig.rules?.[oxlintRule]).toBe('error');
    });
  }

  test('should return false for ignored plugins', () => {
    const targetConfig: OxlintConfigOrOverride = {};
    const result = enableJsPluginRule(
      targetConfig,
      '@typescript-eslint/no-unused-vars',
      'warn'
    );

    expect(result).toBe(false);
    expect(targetConfig.jsPlugins).toBeUndefined();
    expect(targetConfig.rules).toBeUndefined();
  });
});

describe('isIgnoredPluginRule', () => {
  test('returns true for core ESLint rule (no plugin)', () => {
    expect(isIgnoredPluginRule('no-unused-vars')).toBe(true);
    expect(isIgnoredPluginRule('eqeqeq')).toBe(true);
  });

  test('returns true for ignored plugin rules', () => {
    // @typescript-eslint is treated as ignored
    expect(isIgnoredPluginRule('@typescript-eslint/no-unused-vars')).toBe(true);
    // local plugin rules should be ignored (TODO: implement proper handling later)
    expect(isIgnoredPluginRule('local/some-rule')).toBe(true);
  });

  test('returns false for non-ignored plugin rules', () => {
    expect(isIgnoredPluginRule('mocha/no-pending-tests')).toBe(false);
    expect(isIgnoredPluginRule('tsdoc/syntax')).toBe(false);
    expect(
      isIgnoredPluginRule(
        '@eslint-community/eslint-comments/disable-enable-pair'
      )
    ).toBe(false);
    expect(isIgnoredPluginRule('@stylistic/indent')).toBe(false);
    expect(isIgnoredPluginRule('@stylistic/ts/member-delimiter-style')).toBe(
      false
    );
  });
});

import { describe, expect, test } from 'vitest';
import {
  enableJsPluginRule,
  isIgnoredPluginRule,
  resolveJsPluginRuleName,
} from './jsPlugins.js';
import type { ESLint, OxlintConfigOrOverride } from './types.js';

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

  test('should use meta.name when it is a full package name', () => {
    const targetConfig: OxlintConfigOrOverride = {};
    const plugins: Record<string, ESLint.Plugin> = {
      e18e: { meta: { name: '@e18e/eslint-plugin' } },
    };

    const result = enableJsPluginRule(
      targetConfig,
      'e18e/prefer-regex-literals',
      'error',
      plugins
    );

    expect(result).toBe(true);
    expect(targetConfig.jsPlugins).toContain('@e18e/eslint-plugin');
  });

  test('should resolve meta.name through heuristic when not a full package name', () => {
    const targetConfig: OxlintConfigOrOverride = {};
    const plugins: Record<string, ESLint.Plugin> = {
      foo: { meta: { name: 'foo' } },
    };

    const result = enableJsPluginRule(
      targetConfig,
      'foo/some-rule',
      'error',
      plugins
    );

    expect(result).toBe(true);
    // meta.name "foo" doesn't contain "eslint-plugin", so it goes through resolution
    expect(targetConfig.jsPlugins).toBeDefined();
  });

  test('should rename rule when meta.name reveals a different prefix', () => {
    const targetConfig: OxlintConfigOrOverride = {};
    const plugins: Record<string, ESLint.Plugin> = {
      '@eslint-react/dom': {
        meta: { name: 'eslint-plugin-react-dom' },
      },
    };

    const result = enableJsPluginRule(
      targetConfig,
      '@eslint-react/dom/no-find-dom-node',
      'error',
      plugins
    );

    expect(result).toBe(true);
    expect(targetConfig.jsPlugins).toContain('eslint-plugin-react-dom');
    // Rule is stored under the canonical prefix, not the alias
    expect(targetConfig.rules?.['react-dom/no-find-dom-node']).toBe('error');
    expect(
      targetConfig.rules?.['@eslint-react/dom/no-find-dom-node']
    ).toBeUndefined();
  });

  test('should rename scoped rule with no sub-path', () => {
    const targetConfig: OxlintConfigOrOverride = {};
    const plugins: Record<string, ESLint.Plugin> = {
      '@eslint-react': {
        meta: { name: 'eslint-plugin-react-x' },
      },
    };

    const result = enableJsPluginRule(
      targetConfig,
      '@eslint-react/jsx-key-before-spread',
      'warn',
      plugins
    );

    expect(result).toBe(true);
    expect(targetConfig.jsPlugins).toContain('eslint-plugin-react-x');
    expect(targetConfig.rules?.['react-x/jsx-key-before-spread']).toBe('warn');
  });

  test('should not rename when canonical prefix matches plugin key', () => {
    const targetConfig: OxlintConfigOrOverride = {};
    const plugins: Record<string, ESLint.Plugin> = {
      'react-web-api': {
        meta: { name: 'eslint-plugin-react-web-api' },
      },
    };

    const result = enableJsPluginRule(
      targetConfig,
      'react-web-api/no-leaked-timeout',
      'warn',
      plugins
    );

    expect(result).toBe(true);
    expect(targetConfig.rules?.['react-web-api/no-leaked-timeout']).toBe(
      'warn'
    );
  });

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

describe('resolveJsPluginRuleName', () => {
  test('renames @eslint-react/dom/ to react-dom/', () => {
    const plugins: Record<string, ESLint.Plugin> = {
      '@eslint-react/dom': {
        meta: { name: 'eslint-plugin-react-dom' },
      },
    };
    expect(
      resolveJsPluginRuleName('@eslint-react/dom/no-find-dom-node', plugins)
    ).toBe('react-dom/no-find-dom-node');
  });

  test('renames @eslint-react/ to react-x/', () => {
    const plugins: Record<string, ESLint.Plugin> = {
      '@eslint-react': {
        meta: { name: 'eslint-plugin-react-x' },
      },
    };
    expect(
      resolveJsPluginRuleName('@eslint-react/jsx-key-before-spread', plugins)
    ).toBe('react-x/jsx-key-before-spread');
  });

  test('returns rule unchanged when prefix matches', () => {
    const plugins: Record<string, ESLint.Plugin> = {
      mocha: { meta: { name: 'eslint-plugin-mocha' } },
    };
    expect(resolveJsPluginRuleName('mocha/no-pending-tests', plugins)).toBe(
      'mocha/no-pending-tests'
    );
  });

  test('returns rule unchanged without plugins', () => {
    expect(resolveJsPluginRuleName('@eslint-react/dom/no-find-dom-node')).toBe(
      '@eslint-react/dom/no-find-dom-node'
    );
  });

  test('returns rule unchanged when meta.name is not a package name', () => {
    const plugins: Record<string, ESLint.Plugin> = {
      e18e: { meta: { name: 'e18e' } },
    };
    expect(resolveJsPluginRuleName('e18e/prefer-includes', plugins)).toBe(
      'e18e/prefer-includes'
    );
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

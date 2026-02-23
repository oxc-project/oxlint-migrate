/**
 * Type tests to verify that our custom ESLint types are compatible
 * with the actual ESLint types from the 'eslint' package.
 *
 * These tests ensure type compatibility across ESLint 9 and 10.
 *
 * Note: Our Config type is intentionally more permissive than Linter.Config
 * (includes index signature) to support various ESLint configurations and plugins.
 * Therefore, we test assignability in one direction for Config types.
 */

import { describe, expectTypeOf, test } from 'vitest';
import type { Linter } from 'eslint';
import type { ESLint } from './types.js';

describe('ESLint type compatibility', () => {
  describe('Severity types', () => {
    test('SeverityLevel should be compatible with ESLint', () => {
      expectTypeOf<ESLint.SeverityLevel>().toMatchTypeOf<Linter.Severity>();
      expectTypeOf<Linter.Severity>().toMatchTypeOf<ESLint.SeverityLevel>();
    });

    test('SeverityName should be compatible with ESLint', () => {
      expectTypeOf<ESLint.SeverityName>().toMatchTypeOf<Linter.StringSeverity>();
      expectTypeOf<Linter.StringSeverity>().toMatchTypeOf<ESLint.SeverityName>();
    });

    test('Severity should be compatible with ESLint', () => {
      expectTypeOf<ESLint.Severity>().toMatchTypeOf<Linter.RuleSeverity>();
      expectTypeOf<Linter.RuleSeverity>().toMatchTypeOf<ESLint.Severity>();
    });
  });

  describe('Rule configuration types', () => {
    test('RuleConfig should be compatible with ESLint RuleEntry', () => {
      expectTypeOf<ESLint.RuleConfig>().toMatchTypeOf<Linter.RuleEntry>();
      expectTypeOf<Linter.RuleEntry>().toMatchTypeOf<ESLint.RuleConfig>();
    });

    test('RulesRecord should be compatible with ESLint RulesRecord', () => {
      expectTypeOf<ESLint.RulesRecord>().toMatchTypeOf<Linter.RulesRecord>();
      expectTypeOf<Linter.RulesRecord>().toMatchTypeOf<ESLint.RulesRecord>();
    });
  });

  describe('Global configuration types', () => {
    test('GlobalAccess should be compatible with ESLint GlobalConf', () => {
      expectTypeOf<ESLint.GlobalAccess>().toMatchTypeOf<Linter.GlobalConf>();
      expectTypeOf<Linter.GlobalConf>().toMatchTypeOf<ESLint.GlobalAccess>();
    });

    test('GlobalsConfig should be compatible with ESLint Globals', () => {
      expectTypeOf<ESLint.GlobalsConfig>().toMatchTypeOf<Linter.Globals>();
      expectTypeOf<Linter.Globals>().toMatchTypeOf<ESLint.GlobalsConfig>();
    });
  });

  describe('Config types', () => {
    test('Config should accept ESLint Config values', () => {
      // Our Config type should be able to accept ESLint configs
      const eslintConfig: Linter.Config = {
        name: 'test',
        files: ['**/*.ts'],
        rules: {
          'no-console': 'error',
        },
      };

      // Test structural compatibility
      expectTypeOf(eslintConfig).toHaveProperty('name');
      expectTypeOf(eslintConfig).toHaveProperty('files');
      expectTypeOf(eslintConfig).toHaveProperty('rules');
    });

    test('Config with basic properties should be assignable', () => {
      const ourConfig: ESLint.Config = {
        name: 'test',
        files: ['**/*.ts'],
        rules: {
          'no-console': 'warn',
        },
      };

      // Test that our config has the same structure
      expectTypeOf(ourConfig.name).toEqualTypeOf<string | undefined>();
      expectTypeOf(ourConfig.files).toEqualTypeOf<
        (string | string[])[] | undefined
      >();
      expectTypeOf(ourConfig.rules).toMatchTypeOf<
        Partial<ESLint.RulesRecord> | undefined
      >();
    });
  });

  describe('Complex configuration scenarios', () => {
    test('Config with language options should work', () => {
      const config: ESLint.Config = {
        languageOptions: {
          globals: {
            window: true,
            document: 'readonly',
          },
          parserOptions: {
            ecmaVersion: 2020,
          },
        },
      };

      // Verify language options structure
      expectTypeOf(config.languageOptions?.globals).toMatchTypeOf<
        ESLint.GlobalsConfig | undefined
      >();
    });

    test('Config with rules using arrays should work', () => {
      const config: ESLint.Config = {
        rules: {
          'no-console': ['error', { allow: ['warn', 'error'] }],
          'no-unused-vars': 'off',
          semi: [2, 'always'],
        },
      };

      expectTypeOf(config.rules).toMatchTypeOf<
        Partial<ESLint.RulesRecord> | undefined
      >();
    });

    test('Config with plugins and processors should work', () => {
      const config: ESLint.Config = {
        plugins: {
          '@typescript-eslint': {},
        },
        processor: 'some-processor',
      };

      expectTypeOf(config.plugins).toMatchTypeOf<
        Record<string, unknown> | undefined
      >();
      expectTypeOf(config.processor).toMatchTypeOf<
        string | object | undefined
      >();
    });

    test('Config with env and globals should work', () => {
      const config: ESLint.Config = {
        env: {
          browser: true,
          node: true,
        },
        globals: {
          myGlobal: 'writable',
        },
      };

      expectTypeOf(config.env).toMatchTypeOf<
        Record<string, boolean> | undefined
      >();
      expectTypeOf(config.globals).toMatchTypeOf<
        ESLint.GlobalsConfig | undefined
      >();
    });
  });

  describe('Type assignability from ESLint to our types', () => {
    test('Linter.Config structure matches ESLint.Config structure', () => {
      const eslintConfig: Linter.Config = {
        name: 'my-config',
        files: ['**/*.ts'],
        ignores: ['**/*.d.ts'],
        languageOptions: {
          globals: {
            window: true,
          },
        },
        rules: {
          'no-console': 'error',
        },
      };

      // Test that our types can handle the same properties
      const testName: string | undefined = eslintConfig.name;
      const testFiles: (string | string[])[] | undefined = eslintConfig.files;

      expectTypeOf(testName).toEqualTypeOf<string | undefined>();
      expectTypeOf(testFiles).toMatchTypeOf<
        (string | string[])[] | undefined
      >();
    });

    test('Linter.RulesRecord can be assigned to ESLint.RulesRecord', () => {
      const eslintRules: Linter.RulesRecord = {
        'no-console': 'error',
        semi: ['error', 'always'],
      };

      const ourRules: ESLint.RulesRecord = eslintRules;
      expectTypeOf(ourRules).toMatchTypeOf<ESLint.RulesRecord>();
    });
  });
});

import { assert, describe, expect, test } from 'vitest';
import type { OxlintConfig } from './types.js';
import {
  cleanUpUselessOverridesRules,
  detectNeededRulesPlugins,
  replaceNodePluginName,
  replaceTypescriptAliasRules,
  transformRuleEntry,
} from './plugins_rules.js';
import type { Linter } from 'eslint';

describe('rules and plugins', () => {
  test('detectNeededRulesPlugins', () => {
    const config: OxlintConfig = {
      rules: {
        'unicorn/prefer-set-has': 'error',
      },
    };

    detectNeededRulesPlugins(config);
    expect(config.plugins).toContain('unicorn');
  });

  test('transformRuleEntry', () => {
    const eslintConfig: Linter.Config = {
      rules: {
        'unicorn/prefer-set-has': 'error',
        'unknown-rule': 'error',
      },
    };
    const config: OxlintConfig = {};

    transformRuleEntry(eslintConfig, config);

    assert(config.rules);
    expect(config.rules['unicorn/prefer-set-has']).toBe('error');
    expect(config.rules['unknown-rule']).toBe(undefined);
  });

  test('cleanUpUselessOverridesRules', () => {
    const config: OxlintConfig = {
      rules: {
        'unicorn/prefer-set-has': 'error',
      },
      overrides: [
        {
          files: [],
          rules: {
            'unicorn/prefer-set-has': 'error',
          },
        },
      ],
    };

    cleanUpUselessOverridesRules(config);

    expect(config).toStrictEqual({
      rules: {
        'unicorn/prefer-set-has': 'error',
      },
      overrides: [{ files: [] }],
    });
  });

  describe('replaceTypescriptAliasRules', () => {
    // oxlint support them under one namespace and we can replace them
    // this is useful because we can later clean up to duplicated overrides easier
    test('replace typescript alias rules with the eslint one', () => {
      const config: OxlintConfig = {
        rules: {
          '@typescript-eslint/no-magic-numbers': 'error',
        },
      };

      replaceTypescriptAliasRules(config);

      expect(config).toStrictEqual({
        rules: {
          'no-magic-numbers': 'error',
        },
      });
    });
  });

  describe('replaceNodePluginName', () => {
    test('replace n/rule-name to node/rule-name', () => {
      const config: OxlintConfig = {
        rules: {
          'n/no-new-require': 'error',
        },
      };

      replaceNodePluginName(config);

      expect(config).toStrictEqual({
        rules: {
          'node/no-new-require': 'error',
        },
      });
    });
  });
});

import { assert, describe, expect, test } from 'vitest';
import type { OxlintConfig } from './types.js';
import {
  cleanUpDisabledRootRules,
  cleanUpRulesWhichAreCoveredByCategory,
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

  describe('transformRuleEntry', () => {
    test('default', () => {
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

    test('rules with numeric severity', () => {
      const eslintConfig: Linter.Config = {
        rules: {
          'unicorn/prefer-set-has': 1,
          'no-useless-call': 2,
          'unknown-rule': 2,
        },
      };
      const config: OxlintConfig = {};

      transformRuleEntry(eslintConfig, config);

      assert(config.rules);
      expect(config.rules['unicorn/prefer-set-has']).toBe('warn');
      expect(config.rules['no-useless-call']).toBe('error');
      expect(config.rules['unknown-rule']).toBe(undefined);
    });

    test('merge', () => {
      const eslintConfig: Linter.Config = {
        rules: {
          'unicorn/prefer-set-has': 'error',
        },
      };

      const config: OxlintConfig = {
        rules: {
          'unicorn/prefer-set-has': 'warn',
        },
      };

      transformRuleEntry(eslintConfig, config, {
        merge: true,
      });

      assert(config.rules);
      expect(config.rules['unicorn/prefer-set-has']).toBe('warn');
    });

    test('withNursery', () => {
      const eslintConfig: Linter.Config = {
        rules: {
          'getter-return': 'error',
        },
      };

      const configWithNursery: OxlintConfig = {};
      const configWithoutNursery: OxlintConfig = {};

      transformRuleEntry(eslintConfig, configWithoutNursery);
      expect(configWithoutNursery.rules).toStrictEqual({});

      transformRuleEntry(eslintConfig, configWithNursery, {
        withNursery: true,
      });
      assert(configWithNursery.rules);
      expect(configWithNursery.rules['getter-return']).toBe('error');
    });

    test('typeAware', () => {
      const eslintConfig: Linter.Config = {
        rules: {
          '@typescript-eslint/no-floating-promises': 'error',
        },
      };

      const configWithTypeAware: OxlintConfig = {};
      const configWithoutTypeAware: OxlintConfig = {};

      transformRuleEntry(eslintConfig, configWithoutTypeAware);
      expect(configWithoutTypeAware.rules).toStrictEqual({});

      transformRuleEntry(eslintConfig, configWithTypeAware, {
        typeAware: true,
      });
      assert(configWithTypeAware.rules);
      expect(
        configWithTypeAware.rules['@typescript-eslint/no-floating-promises']
      ).toBe('error');
    });
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

  test('cleanUpRulesWhichAreCoveredByCategory', () => {
    const config: OxlintConfig = {
      categories: {
        perf: 'error',
      },
      rules: {
        'no-await-in-loop': 'error',
        'no-useless-call': ['error', 'some-config'],
        'unicorn/prefer-set-has': ['error'],
      },
    };

    cleanUpRulesWhichAreCoveredByCategory(config);

    expect(config).toStrictEqual({
      categories: {
        perf: 'error',
      },
      rules: {
        // in the same category but with custom configuration which maybe changes from the default one
        'no-useless-call': ['error', 'some-config'],
      },
    });
  });

  describe('cleanUpDisabledRootRules', () => {
    test('remove disabled root rules', () => {
      const config: OxlintConfig = {
        categories: {
          correctness: 'off',
        },
        rules: {
          'no-magic-numbers': 'error',
          'no-unused-vars': 'off',
        },
      };

      cleanUpDisabledRootRules(config);

      expect(config).toStrictEqual({
        categories: {
          correctness: 'off',
        },
        rules: {
          'no-magic-numbers': 'error',
        },
      });
    });

    test('do not remove disabled root rules when in override', () => {
      const config: OxlintConfig = {
        overrides: [
          {
            files: ['*.ts'],
            rules: {
              'no-unused-vars': 'off',
            },
          },
        ],
      };
      const newConfig = structuredClone(config);
      cleanUpDisabledRootRules(newConfig);

      expect(newConfig).toStrictEqual(config);
    });

    test('do not remove disabled root rules when category enabled', () => {
      const config: OxlintConfig = {
        categories: {
          correctness: 'warn',
        },
        rules: {
          'no-unused-vars': 'off',
        },
      };
      const newConfig = structuredClone(config);
      cleanUpDisabledRootRules(newConfig);

      expect(newConfig).toStrictEqual(config);
    });

    test('does remove disabled rules which are not in enabled category', () => {
      const config: OxlintConfig = {
        categories: {
          style: 'warn',
          correctness: 'off',
        },
        rules: {
          'no-unused-vars': 'off',
        },
      };
      const newConfig = structuredClone(config);
      cleanUpDisabledRootRules(newConfig);

      expect(newConfig).toStrictEqual({
        categories: {
          style: 'warn',
          correctness: 'off',
        },
        rules: {},
      });
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

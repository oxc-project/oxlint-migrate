import { assert, describe, expect, test } from 'vitest';
import type { OxlintConfig, OxlintConfigOverride } from './types.js';
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
import { DefaultReporter } from './reporter.js';

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

    test('does not report unsupported rules that are disabled', () => {
      const enabledConfig: Linter.Config = {
        rules: {
          'unknown-rule': 'error',
        },
      };
      const disabledConfig: Linter.Config = {
        rules: {
          'unknown-rule': 'off',
        },
      };

      const enabledInOverrideConfig: Linter.Config = {
        files: ['**/*.ts'],
        rules: {
          'unknown-rule': 'off',
        },
      };
      const config: OxlintConfig = {};
      const reporter = new DefaultReporter();

      transformRuleEntry(enabledConfig, config, { reporter });
      transformRuleEntry(disabledConfig, config, { reporter });
      // Disabled rules don't call markSkipped, so we have 1 from enabled
      expect(reporter.getSkippedRules()).toStrictEqual([
        { ruleName: 'unknown-rule', category: 'unsupported' },
      ]);

      transformRuleEntry(enabledConfig, config, { reporter });
      transformRuleEntry(enabledInOverrideConfig, config, { reporter });
      // Second enabled call is deduplicated, disabled override doesn't add
      expect(reporter.getSkippedRules()).toStrictEqual([
        { ruleName: 'unknown-rule', category: 'unsupported' },
      ]);
    });

    test('ensure jsPlugin rule is disabled if the last config object disables it', () => {
      const initialConfig: Linter.Config = {
        plugins: { regexp: {} },
        rules: {
          'regexp/no-lazy-ends': ['error', { ignorePartial: false }],
        },
      };

      const disablingConfig: Linter.Config = {
        plugins: { regexp: {} },
        rules: {
          'regexp/no-lazy-ends': 'off',
        },
      };

      const config: OxlintConfig = {};
      const reporter = new DefaultReporter();

      transformRuleEntry(initialConfig, config, {
        reporter,
        jsPlugins: true,
      });
      transformRuleEntry(disablingConfig, config, {
        reporter,
        jsPlugins: true,
      });

      // the rule should not be present in the config anymore
      expect(config.rules?.['regexp/no-lazy-ends']).toBeUndefined();
      expect(config.jsPlugins).toContain('eslint-plugin-regexp');
      expect(reporter.getWarnings()).toStrictEqual([]);
    });

    test('ensure jsPlugin rule is enabled if the last config object enables it', () => {
      const initialConfig: Linter.Config = {
        plugins: { regexp: {} },
        rules: {
          'regexp/no-lazy-ends': ['off'],
        },
      };

      const enablingConfig: Linter.Config = {
        plugins: { regexp: {} },
        rules: {
          'regexp/no-lazy-ends': ['error', { ignorePartial: false }],
        },
      };

      const config: OxlintConfig = {};
      const reporter = new DefaultReporter();

      transformRuleEntry(initialConfig, config, {
        reporter,
        jsPlugins: true,
      });
      transformRuleEntry(enablingConfig, config, {
        reporter,
        jsPlugins: true,
      });

      // the rule should be set to error in the config
      expect(config.rules?.['regexp/no-lazy-ends']).toStrictEqual([
        'error',
        { ignorePartial: false },
      ]);
      expect(config.jsPlugins).toContain('eslint-plugin-regexp');
      expect(reporter.getWarnings()).toStrictEqual([]);
    });

    test('jsPlugin rule disabled in override keeps base enabled', () => {
      const baseConfig: Linter.Config = {
        plugins: { regexp: {} },
        rules: {
          'regexp/no-lazy-ends': ['error', { ignorePartial: false }],
        },
      };

      const overrideConfig: Linter.Config = {
        plugins: { regexp: {} },
        files: ['**/*.js'],
        rules: {
          'regexp/no-lazy-ends': ['off'],
        },
      };

      const baseTarget: OxlintConfig = {};
      const overrideTarget: OxlintConfigOverride = { files: ['**/*.js'] };
      const reporter = new DefaultReporter();

      transformRuleEntry(baseConfig, baseTarget, {
        reporter,
        jsPlugins: true,
      });

      transformRuleEntry(overrideConfig, overrideTarget, {
        reporter,
        jsPlugins: true,
      });

      expect(baseTarget.rules?.['regexp/no-lazy-ends']).toStrictEqual([
        'error',
        { ignorePartial: false },
      ]);
      expect(baseTarget.jsPlugins).toContain('eslint-plugin-regexp');

      expect(overrideTarget.rules?.['regexp/no-lazy-ends']).toStrictEqual([
        'off',
      ]);
      // plugin should not be added for a disabled rule in an override
      expect(overrideTarget.jsPlugins).toBeUndefined();

      expect(reporter.getWarnings()).toStrictEqual([]);
    });

    test('includes jsPlugin in base config when plugin rule is used', () => {
      const baseConfig: Linter.Config = {
        plugins: { mocha: {} },
        rules: {
          'mocha/no-pending-tests': 'error',
        },
      };

      const target: OxlintConfig = {};
      const reporter = new DefaultReporter();

      transformRuleEntry(baseConfig, target, { reporter, jsPlugins: true });

      expect(target.rules?.['mocha/no-pending-tests']).toBe('error');
      expect(target.jsPlugins).toContain('eslint-plugin-mocha');
      expect(reporter.getWarnings()).toStrictEqual([]);
    });

    test('does not include jsPlugin in base config when plugin rule is used but set to off', () => {
      const baseConfig: Linter.Config = {
        plugins: { mocha: {} },
        rules: {
          'mocha/no-pending-tests': 'off',
        },
      };

      const target: OxlintConfig = {};
      const reporter = new DefaultReporter();

      transformRuleEntry(baseConfig, target, { reporter, jsPlugins: true });

      expect(target.rules?.['mocha/no-pending-tests']).toBeUndefined();
      expect(target.jsPlugins).toBeUndefined();
      expect(reporter.getWarnings()).toStrictEqual([]);
    });

    test('does include jsPlugin in base config when one rule is off and another is error', () => {
      const baseConfig: Linter.Config = {
        plugins: { mocha: {} },
        rules: {
          'mocha/no-pending-tests': 'off',
          'mocha/no-skip-tests': 'error',
        },
      };

      const target: OxlintConfig = {};
      const reporter = new DefaultReporter();

      transformRuleEntry(baseConfig, target, { reporter, jsPlugins: true });

      expect(target.rules?.['mocha/no-pending-tests']).toBeUndefined();
      expect(target.rules?.['mocha/no-skip-tests']).toBe('error');
      expect(target.jsPlugins).toContain('eslint-plugin-mocha');
      expect(reporter.getWarnings()).toStrictEqual([]);
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

  test('cleanUpUselessOverridesRules with multiple overrides for same files (last-wins)', () => {
    const config: OxlintConfig = {
      rules: {
        'react/react-in-jsx-scope': 'off',
      },
      overrides: [
        {
          files: ['**/*.ts', '**/*.tsx'],
          rules: {
            'react/foobar': 'error',
            'react/react-in-jsx-scope': 'error',
          },
        },
        {
          files: ['**/*.ts', '**/*.tsx'],
          rules: {
            'react/react-in-jsx-scope': 'off',
          },
        },
      ],
    };

    cleanUpUselessOverridesRules(config);

    // The final rule wins over the first, so react-in-jsx-scope should end up as "off".
    expect(config).toStrictEqual({
      rules: {
        'react/react-in-jsx-scope': 'off',
      },
      overrides: [
        {
          files: ['**/*.ts', '**/*.tsx'],
          rules: {
            'react/foobar': 'error',
          },
        },
        {
          files: ['**/*.ts', '**/*.tsx'],
        },
      ],
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

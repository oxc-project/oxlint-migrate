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

      transformRuleEntry(eslintConfig, config, undefined, {
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

      transformRuleEntry(eslintConfig, configWithoutNursery, undefined, {});
      expect(configWithoutNursery.rules).toStrictEqual({});

      transformRuleEntry(eslintConfig, configWithNursery, undefined, {
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

      transformRuleEntry(eslintConfig, configWithTypeAware, undefined, {
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

      transformRuleEntry(enabledConfig, config, undefined, { reporter });
      transformRuleEntry(disabledConfig, config, undefined, { reporter });
      expect(reporter.getSkippedRulesByCategory()).toStrictEqual({
        nursery: [],
        'type-aware': [],
        'not-implemented': [],
        'js-plugins': [],
        unsupported: [],
      });

      transformRuleEntry(enabledConfig, config, undefined, { reporter });
      transformRuleEntry(enabledInOverrideConfig, config, undefined, {
        reporter,
      });
      expect(reporter.getSkippedRulesByCategory()).toStrictEqual({
        nursery: [],
        'type-aware': [],
        'not-implemented': ['unknown-rule'],
        'js-plugins': [],
        unsupported: [],
      });
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

      transformRuleEntry(initialConfig, config, undefined, {
        reporter,
        jsPlugins: true,
      });
      transformRuleEntry(disablingConfig, config, undefined, {
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

      transformRuleEntry(initialConfig, config, undefined, {
        reporter,
        jsPlugins: true,
      });
      transformRuleEntry(enablingConfig, config, undefined, {
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

      transformRuleEntry(baseConfig, baseTarget, undefined, {
        reporter,
        jsPlugins: true,
      });

      transformRuleEntry(overrideConfig, overrideTarget, undefined, {
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

      transformRuleEntry(baseConfig, target, undefined, {
        reporter,
        jsPlugins: true,
      });

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

      transformRuleEntry(baseConfig, target, undefined, {
        reporter,
        jsPlugins: true,
      });

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

      transformRuleEntry(baseConfig, target, undefined, {
        reporter,
        jsPlugins: true,
      });

      expect(target.rules?.['mocha/no-pending-tests']).toBeUndefined();
      expect(target.rules?.['mocha/no-skip-tests']).toBe('error');
      expect(target.jsPlugins).toContain('eslint-plugin-mocha');
      expect(reporter.getWarnings()).toStrictEqual([]);
    });

    test('rule with options then same rule without options should preserve options', () => {
      const eslintConfig1: Linter.Config = {
        rules: {
          'no-magic-numbers': ['error', { ignoreArrayIndexes: true }],
        },
      };
      const eslintConfig2: Linter.Config = {
        rules: {
          'no-magic-numbers': 'error',
        },
      };
      const config: OxlintConfig = {};

      transformRuleEntry(eslintConfig1, config);
      transformRuleEntry(eslintConfig2, config);

      assert(config.rules);
      expect(config.rules['no-magic-numbers']).toStrictEqual([
        'error',
        { ignoreArrayIndexes: true },
      ]);
    });

    test('rule with options then same rule with different severity but no options should preserve options', () => {
      const eslintConfig1: Linter.Config = {
        rules: {
          'no-magic-numbers': ['error', { ignoreArrayIndexes: true }],
        },
      };
      const eslintConfig2: Linter.Config = {
        rules: {
          'no-magic-numbers': 'warn',
        },
      };
      const config: OxlintConfig = {};

      transformRuleEntry(eslintConfig1, config);
      transformRuleEntry(eslintConfig2, config);

      assert(config.rules);
      expect(config.rules['no-magic-numbers']).toStrictEqual([
        'warn',
        { ignoreArrayIndexes: true },
      ]);
    });

    test('rule with options then same rule with different options should override', () => {
      const eslintConfig1: Linter.Config = {
        rules: {
          'no-magic-numbers': ['error', { ignoreArrayIndexes: true }],
        },
      };
      const eslintConfig2: Linter.Config = {
        rules: {
          'no-magic-numbers': ['error', { ignoreArrayIndexes: false }],
        },
      };
      const config: OxlintConfig = {};

      transformRuleEntry(eslintConfig1, config);
      transformRuleEntry(eslintConfig2, config);

      assert(config.rules);
      expect(config.rules['no-magic-numbers']).toStrictEqual([
        'error',
        { ignoreArrayIndexes: false },
      ]);
    });

    test('rule with options then same rule turned off should not preserve options', () => {
      const eslintConfig1: Linter.Config = {
        rules: {
          'no-magic-numbers': ['error', { ignoreArrayIndexes: true }],
        },
      };
      const eslintConfig2: Linter.Config = {
        rules: {
          'no-magic-numbers': 'off',
        },
      };
      const config: OxlintConfig = {};

      transformRuleEntry(eslintConfig1, config);
      transformRuleEntry(eslintConfig2, config);

      assert(config.rules);
      // When turned off, the rule should be set to 'off', not preserving options
      expect(config.rules['no-magic-numbers']).toBe('off');
    });

    test('base config with options, file override with severity only should preserve options', () => {
      const baseConfig: Linter.Config = {
        rules: {
          'no-magic-numbers': ['error', { ignore: [5, 7] }],
        },
      };
      const overrideConfig: Linter.Config = {
        files: ['**/src/**'],
        rules: {
          'no-magic-numbers': ['error'],
        },
      };

      const baseTarget: OxlintConfig = {};
      const overrideTarget: OxlintConfigOverride = { files: ['**/src/**'] };

      transformRuleEntry(baseConfig, baseTarget, undefined);
      transformRuleEntry(overrideConfig, overrideTarget, baseTarget, undefined);

      assert(baseTarget.rules);
      expect(baseTarget.rules['no-magic-numbers']).toStrictEqual([
        'error',
        { ignore: [5, 7] },
      ]);

      assert(overrideTarget.rules);
      expect(overrideTarget.rules['no-magic-numbers']).toStrictEqual([
        'error',
        { ignore: [5, 7] },
      ]);
    });

    test('base config should override earlier overrides (last-wins semantics)', () => {
      const overrideConfig: Linter.Config = {
        files: ['**/*.js'],
        rules: {
          'react-hooks/exhaustive-deps': 'warn',
        },
      };

      const baseConfig: Linter.Config = {
        rules: {
          'react-hooks/exhaustive-deps': 'off',
        },
      };

      const overrides: OxlintConfigOverride[] = [{ files: ['**/*.js'] }];
      const baseTarget: OxlintConfig = {};

      transformRuleEntry(overrideConfig, overrides[0], undefined);
      transformRuleEntry(
        baseConfig,
        baseTarget,
        undefined,
        undefined,
        overrides
      );

      // rule should be set to 'off' in base
      expect(baseTarget.rules?.['react-hooks/exhaustive-deps']).toBe('off');
      // rule should be removed from overrides (base config wins)
      expect(
        overrides[0].rules?.['react-hooks/exhaustive-deps']
      ).toBeUndefined();
    });

    test('unsupported rules disabled in base config should be removed from overrides with jsPlugins', () => {
      const overrideConfig: Linter.Config = {
        files: ['**/*.js'],
        rules: {
          'some-plugin/some-rule': 'warn',
        },
      };

      const baseConfig: Linter.Config = {
        rules: {
          'some-plugin/some-rule': 'off',
        },
      };

      const overrides: OxlintConfigOverride[] = [{ files: ['**/*.js'] }];
      const baseTarget: OxlintConfig = {};

      transformRuleEntry(overrideConfig, overrides[0], undefined, {
        jsPlugins: true,
      });
      transformRuleEntry(
        baseConfig,
        baseTarget,
        undefined,
        { jsPlugins: true },
        overrides
      );

      // unsupported rule disabled in base config is dropped entirely
      expect(baseTarget.rules?.['some-plugin/some-rule']).toBeUndefined();
      // rule should also be removed from overrides
      expect(overrides[0].rules?.['some-plugin/some-rule']).toBeUndefined();
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

    // Consecutive same-files overrides are merged (last-wins).
    // react-in-jsx-scope ends up as 'off' which matches root, so it's removed.
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
      ],
    });
  });

  test('cleanUpUselessOverridesRules merges all properties of consecutive same-files overrides', () => {
    const config: OxlintConfig = {
      overrides: [
        {
          files: ['**/*.ts', '**/*.tsx'],
          plugins: ['typescript', 'oxc'],
          jsPlugins: ['eslint-plugin-awesome', 'eslint-plugin-splendid'],
          env: { browser: true, node: false },
          globals: { jQuery: 'readonly', process: 'readonly' },
          categories: { correctness: 'error' },
          rules: {
            'no-var': 'error',
            'prefer-const': 'error',
          },
        },
        {
          files: ['**/*.ts', '**/*.tsx'],
          plugins: ['react', 'oxc'],
          jsPlugins: ['eslint-plugin-crap', 'eslint-plugin-awesome'],
          env: { node: true, worker: true },
          globals: { process: 'writable', __dirname: 'readonly' },
          categories: { correctness: 'warn', suspicious: 'error' },
          rules: {
            'no-var': 'warn',
            'no-console': 'error',
          },
        },
        {
          files: ['**/*.ts', '**/*.tsx'],
          globals: { document: 'readonly' },
          rules: {
            'no-trousers': 'error',
          },
        },
      ],
    };

    cleanUpUselessOverridesRules(config);

    expect(config).toStrictEqual({
      overrides: [
        {
          files: ['**/*.ts', '**/*.tsx'],
          // `plugins` / `jsPlugins`: set union (deduplicated)
          plugins: ['typescript', 'oxc', 'react'],
          jsPlugins: [
            'eslint-plugin-awesome',
            'eslint-plugin-splendid',
            'eslint-plugin-crap',
          ],
          // `env` / `globals` / `categories` / `rules`: last-wins per key
          env: { browser: true, node: true, worker: true },
          globals: {
            jQuery: 'readonly',
            process: 'writable',
            __dirname: 'readonly',
            document: 'readonly',
          },
          categories: { correctness: 'warn', suspicious: 'error' },
          rules: {
            'no-var': 'warn',
            'prefer-const': 'error',
            'no-console': 'error',
            'no-trousers': 'error',
          },
        },
      ],
    });
  });

  test('cleanUpUselessOverridesRules does not merge non-consecutive same-files overrides', () => {
    const config: OxlintConfig = {
      rules: {
        'no-debugger': 'error',
      },
      overrides: [
        {
          files: ['*.test.js'],
          rules: {
            'accessor-pairs': 'warn',
          },
        },
        {
          files: ['*.js'],
          rules: {
            'accessor-pairs': 'error',
          },
        },
        {
          files: ['*.test.js'],
          rules: {
            'accessor-pairs': 'off',
          },
        },
      ],
    };

    cleanUpUselessOverridesRules(config);

    // Non-consecutive same-files overrides must NOT be merged — the
    // intervening *.js override would change precedence
    expect(config).toStrictEqual({
      rules: {
        'no-debugger': 'error',
      },
      overrides: [
        {
          files: ['*.test.js'],
          rules: {
            'accessor-pairs': 'warn',
          },
        },
        {
          files: ['*.js'],
          rules: {
            'accessor-pairs': 'error',
          },
        },
        {
          files: ['*.test.js'],
          rules: {
            'accessor-pairs': 'off',
          },
        },
      ],
    });
  });

  test('cleanUpUselessOverridesRules merges consecutive same-files even without root rules', () => {
    const config: OxlintConfig = {
      overrides: [
        {
          files: ['*.js'],
          rules: {
            'accessor-pairs': 'warn',
          },
        },
        {
          files: ['*.js'],
          rules: {
            'no-debugger': 'error',
          },
        },
      ],
    };

    cleanUpUselessOverridesRules(config);

    expect(config).toStrictEqual({
      overrides: [
        {
          files: ['*.js'],
          rules: {
            'accessor-pairs': 'warn',
            'no-debugger': 'error',
          },
        },
      ],
    });
  });

  test('cleanUpUselessOverridesRules preserves rule needed to re-assert root value', () => {
    const config: OxlintConfig = {
      rules: {
        'accessor-pairs': 'error',
      },
      overrides: [
        {
          files: ['*.js'],
          rules: {
            'accessor-pairs': 'warn',
          },
        },
        {
          files: ['*.test.js'],
          rules: {
            'accessor-pairs': 'error',
          },
        },
      ],
    };

    cleanUpUselessOverridesRules(config);

    // The `*.test.js` override re-asserts root value against the `*.js` override,
    // so it must be preserved
    expect(config).toStrictEqual({
      rules: {
        'accessor-pairs': 'error',
      },
      overrides: [
        {
          files: ['*.js'],
          rules: {
            'accessor-pairs': 'warn',
          },
        },
        {
          files: ['*.test.js'],
          rules: {
            'accessor-pairs': 'error',
          },
        },
      ],
    });
  });

  test('cleanUpUselessOverridesRules removes redundant rules when no previous conflict', () => {
    const config: OxlintConfig = {
      rules: {
        'accessor-pairs': 'error',
      },
      overrides: [
        {
          files: ['*.js'],
          rules: {
            'accessor-pairs': 'error',
          },
        },
        {
          files: ['*.ts'],
          rules: {
            'accessor-pairs': 'error',
          },
        },
      ],
    };

    cleanUpUselessOverridesRules(config);

    // Both overrides have the same value as root with no conflicting
    // previous override, so both rules should be removed
    expect(config).toStrictEqual({
      rules: {
        'accessor-pairs': 'error',
      },
      overrides: [{ files: ['*.js'] }, { files: ['*.ts'] }],
    });
  });

  test('cleanUpUselessOverridesRules removes redundant rules when no previous conflict, but keeps others with conflicting overrides', () => {
    const config: OxlintConfig = {
      rules: {
        'accessor-pairs': 'error',
      },
      overrides: [
        {
          files: ['*.js'],
          rules: {
            'accessor-pairs': 'error',
          },
        },
        {
          files: ['*.ts'],
          rules: {
            'accessor-pairs': 'off',
          },
        },
        {
          files: ['*.test.ts'],
          rules: {
            'accessor-pairs': 'error',
          },
        },
      ],
    };

    cleanUpUselessOverridesRules(config);

    // 1st override had same value as root with no conflicting overrides.
    // 2nd override has different value from root, so must be preserved.
    // 3rd override has same value as root, but conflicts with 2nd override, so must be preserved too.
    expect(config).toStrictEqual({
      rules: {
        'accessor-pairs': 'error',
      },
      overrides: [
        {
          files: ['*.js'],
        },
        {
          files: ['*.ts'],
          rules: {
            'accessor-pairs': 'off',
          },
        },
        {
          files: ['*.test.ts'],
          rules: {
            'accessor-pairs': 'error',
          },
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

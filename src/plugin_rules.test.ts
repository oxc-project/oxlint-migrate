import { assert, describe, expect, test } from 'vitest';
import type { OxlintConfig } from './types.js';
import {
  cleanUpUselessOverridesRules,
  detectNeededRulesPlugins,
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
});

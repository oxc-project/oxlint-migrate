import { describe, expect, test } from 'vitest';
import {
  cleanUpSupersetEnvs,
  cleanUpUselessOverridesEnv,
  detectEnvironmentByGlobals,
  removeGlobalsWithAreCoveredByEnv,
  transformEnvAndGlobals,
  transformEslintGlobalAccessToOxlintGlobalValue,
  warnAboutLargeRootGlobals,
} from './env_globals.js';
import type {
  ESLint,
  OxlintConfig,
  OxlintConfigGlobalsValue,
} from './types.js';
import { DefaultReporter } from './reporter.js';
import globals from 'globals';
import { OxlintGlobals } from 'oxlint';

const transformNPMGlobalsToOxlintGlobals = (
  npmGlobals: Record<string, boolean>
): Record<string, OxlintConfigGlobalsValue> => {
  return Object.fromEntries(
    Object.entries(npmGlobals).map(([key, value]) => [
      key,
      transformEslintGlobalAccessToOxlintGlobalValue(value),
    ])
  );
};

describe('detectEnvironmentByGlobals', () => {
  test('detect es2024', () => {
    const config: OxlintConfig = {
      globals: transformNPMGlobalsToOxlintGlobals(globals.es2024),
    };

    detectEnvironmentByGlobals(config);
    expect(config.env?.es2024).toBe(true);
  });

  test('does not detect unsupported es version', () => {
    const config: OxlintConfig = {
      globals: transformNPMGlobalsToOxlintGlobals(globals.es3),
    };

    detectEnvironmentByGlobals(config);
    expect(config.env).toBeUndefined();
  });

  test('detect browser env with >=97% match (missing a few keys)', () => {
    // Create a copy of browser globals and remove a few keys to simulate version differences
    const browserGlobals = transformNPMGlobalsToOxlintGlobals(globals.browser);
    const totalKeys = Object.keys(browserGlobals).length;
    const keysToRemove = Math.floor(totalKeys * 0.02); // Remove 2% of keys

    let removed = 0;
    for (const key in browserGlobals) {
      if (removed < keysToRemove) {
        delete browserGlobals[key];
        removed++;
      }
    }

    const config: OxlintConfig = {
      globals: browserGlobals,
    };

    detectEnvironmentByGlobals(config);
    expect(config.env?.browser).toBe(true);
    // ensure that browser is the only env detected
    expect(Object.keys(config.env || {}).length).toBe(1);
  });

  test('does not detect env when match is <97%', () => {
    // Create a copy of browser globals and remove >3% of keys
    const browserGlobals = transformNPMGlobalsToOxlintGlobals(globals.browser);
    const totalKeys = Object.keys(browserGlobals).length;
    const keysToRemove = Math.floor(totalKeys * 0.04); // Remove 4% of keys

    let removed = 0;
    for (const key in browserGlobals) {
      if (removed < keysToRemove) {
        delete browserGlobals[key];
        removed++;
      }
    }

    const config: OxlintConfig = {
      globals: browserGlobals,
    };

    detectEnvironmentByGlobals(config);
    expect(config.env?.browser).toBeUndefined();
  });
});

describe('removeGlobalsWithAreCoveredByEnv', () => {
  test('detect es2024', () => {
    const config: OxlintConfig = {
      env: {
        es2024: true,
      },
      globals: transformNPMGlobalsToOxlintGlobals(globals.es2024),
    };

    removeGlobalsWithAreCoveredByEnv(config);
    expect(config.globals).toBeUndefined();
  });
});

describe('transformEnvAndGlobals', () => {
  test('transform languageOptions.ecmaVersion 2024 to env', () => {
    const eslintConfig: ESLint.Config = {
      languageOptions: {
        ecmaVersion: 2024,
      },
    };

    const config: OxlintConfig = {};
    transformEnvAndGlobals(eslintConfig, config);

    expect(config).toStrictEqual({
      env: {
        es2024: true,
      },
    });
  });

  test('transform latest languageOptions.ecmaVersion to 2026', () => {
    const eslintConfig: ESLint.Config = {
      languageOptions: {
        ecmaVersion: 'latest',
      },
    };

    const config: OxlintConfig = {};
    transformEnvAndGlobals(eslintConfig, config);

    expect(config).toStrictEqual({
      env: {
        es2026: true,
      },
    });
  });

  test('cleanUpUselessOverridesEnv', () => {
    const config: OxlintConfig = {
      env: {
        es2024: true,
      },
      overrides: [
        {
          files: [],
          env: {
            es2024: true,
          },
        },
      ],
    };

    cleanUpUselessOverridesEnv(config);

    expect(config).toStrictEqual({
      env: {
        es2024: true,
      },
      overrides: [
        {
          files: [],
        },
      ],
    });
  });
});

describe('warnAboutLargeRootGlobals', () => {
  const makeGlobals = (count: number): ESLint.GlobalsConfig & OxlintGlobals =>
    Object.fromEntries(
      Array.from({ length: count }, (_, i) => [`global${i + 1}`, 'readonly'])
    );

  test('warns when source and final root globals both exceed threshold', () => {
    const reporter = new DefaultReporter();
    const configs: ESLint.Config[] = [
      { languageOptions: { globals: makeGlobals(11) } },
    ];
    const oxlintConfig: OxlintConfig = { globals: makeGlobals(11) };

    warnAboutLargeRootGlobals(configs, oxlintConfig, { reporter });

    const warnings = reporter.getWarnings();
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('Added 11 globals to the root config.');
    expect(warnings[0]).toContain('different version of the `globals` package');
  });

  test('does not warn when source root globals are 10 or fewer', () => {
    const reporter = new DefaultReporter();
    const configs: ESLint.Config[] = [
      { languageOptions: { globals: makeGlobals(10) } },
    ];
    const oxlintConfig: OxlintConfig = { globals: makeGlobals(10) };

    warnAboutLargeRootGlobals(configs, oxlintConfig, { reporter });

    expect(reporter.getWarnings()).toHaveLength(0);
  });

  test('does not warn when final root globals are 10 or fewer', () => {
    const reporter = new DefaultReporter();
    const configs: ESLint.Config[] = [
      { languageOptions: { globals: makeGlobals(11) } },
    ];
    const oxlintConfig: OxlintConfig = { globals: makeGlobals(5) };

    warnAboutLargeRootGlobals(configs, oxlintConfig, { reporter });

    expect(reporter.getWarnings()).toHaveLength(0);
  });

  test('ignores configs with files (overrides)', () => {
    const reporter = new DefaultReporter();
    const configs: ESLint.Config[] = [
      { files: ['*.test.js'], languageOptions: { globals: makeGlobals(20) } },
    ];
    const oxlintConfig: OxlintConfig = { globals: makeGlobals(20) };

    warnAboutLargeRootGlobals(configs, oxlintConfig, { reporter });

    expect(reporter.getWarnings()).toHaveLength(0);
  });

  test('only counts source globals from root configs, not overrides', () => {
    const reporter = new DefaultReporter();
    const configs: ESLint.Config[] = [
      { languageOptions: { globals: { oneGlobal: 'readonly' } } },
      { files: ['*.ts'], languageOptions: { globals: makeGlobals(50) } },
    ];
    const oxlintConfig: OxlintConfig = { globals: makeGlobals(20) };

    warnAboutLargeRootGlobals(configs, oxlintConfig, { reporter });

    expect(reporter.getWarnings()).toHaveLength(0);
  });
});

describe('cleanUpSupersetEnvs', () => {
  test('removes shared-node-browser when node is present', () => {
    const config: OxlintConfig = {
      env: {
        'shared-node-browser': true,
        node: true,
      },
    };

    cleanUpSupersetEnvs(config);

    expect(config).toStrictEqual({
      env: {
        node: true,
      },
    });
  });

  test('does not removes shared-node-browser when node has a different value', () => {
    const config: OxlintConfig = {
      env: {
        'shared-node-browser': true,
        node: false,
      },
    };

    cleanUpSupersetEnvs(config);

    expect(config).toStrictEqual({
      env: {
        'shared-node-browser': true,
        node: false,
      },
    });
  });

  test('removes subset env from override when superset is in same override', () => {
    const config: OxlintConfig = {
      env: {
        es2024: true,
      },
      overrides: [
        {
          files: ['*.test.js'],
          env: {
            'shared-node-browser': true,
            node: true,
          },
        },
      ],
    };

    cleanUpSupersetEnvs(config);

    expect(config).toStrictEqual({
      env: {
        es2024: true,
      },
      overrides: [
        {
          files: ['*.test.js'],
          env: {
            node: true,
          },
        },
      ],
    });
  });

  test('removes subset env from override when superset is in main config', () => {
    const config: OxlintConfig = {
      env: {
        node: true,
      },
      overrides: [
        {
          files: ['*.test.js'],
          env: {
            'shared-node-browser': true,
          },
        },
      ],
    };

    cleanUpSupersetEnvs(config);

    expect(config).toStrictEqual({
      env: {
        node: true,
      },
      overrides: [
        {
          files: ['*.test.js'],
        },
      ],
    });
  });

  test('keeps subset env in override when it differs from superset in main', () => {
    const config: OxlintConfig = {
      env: {
        node: false,
      },
      overrides: [
        {
          files: ['*.test.js'],
          env: {
            'shared-node-browser': true,
          },
        },
      ],
    };

    cleanUpSupersetEnvs(config);

    expect(config).toStrictEqual({
      env: {
        node: false,
      },
      overrides: [
        {
          files: ['*.test.js'],
          env: {
            'shared-node-browser': true,
          },
        },
      ],
    });
  });

  test('keeps subset env in override when superset is also in override with different value', () => {
    const config: OxlintConfig = {
      env: {
        es2024: true,
      },
      overrides: [
        {
          files: ['*.test.js'],
          env: {
            'shared-node-browser': true,
            node: false,
          },
        },
      ],
    };

    cleanUpSupersetEnvs(config);

    expect(config).toStrictEqual({
      env: {
        es2024: true,
      },
      overrides: [
        {
          files: ['*.test.js'],
          env: {
            'shared-node-browser': true,
            node: false,
          },
        },
      ],
    });
  });

  test('handles multiple overrides independently', () => {
    const config: OxlintConfig = {
      env: {
        node: true,
      },
      overrides: [
        {
          files: ['*.test.js'],
          env: {
            'shared-node-browser': true,
          },
        },
        {
          files: ['*.spec.js'],
          env: {
            commonjs: true,
            node: true,
          },
        },
      ],
    };

    cleanUpSupersetEnvs(config);

    expect(config).toStrictEqual({
      env: {
        node: true,
      },
      overrides: [
        {
          files: ['*.test.js'],
        },
        {
          files: ['*.spec.js'],
          env: {
            node: true,
          },
        },
      ],
    });
  });

  test('handles browser superset env in overrides', () => {
    const config: OxlintConfig = {
      env: {
        browser: true,
      },
      overrides: [
        {
          files: ['*.worker.js'],
          env: {
            'shared-node-browser': true,
          },
        },
      ],
    };

    cleanUpSupersetEnvs(config);

    expect(config).toStrictEqual({
      env: {
        browser: true,
      },
      overrides: [
        {
          files: ['*.worker.js'],
        },
      ],
    });
  });

  test('does not remove anything when no superset envs are present', () => {
    const config: OxlintConfig = {
      env: {
        es2024: true,
      },
      overrides: [
        {
          files: ['*.test.js'],
          env: {
            'shared-node-browser': true,
          },
        },
      ],
    };

    cleanUpSupersetEnvs(config);

    expect(config).toStrictEqual({
      env: {
        es2024: true,
      },
      overrides: [
        {
          files: ['*.test.js'],
          env: {
            'shared-node-browser': true,
          },
        },
      ],
    });
  });
});

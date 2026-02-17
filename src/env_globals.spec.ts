import { describe, expect, test } from 'vitest';
import {
  cleanUpSupersetEnvs,
  cleanUpUselessOverridesEnv,
  detectEnvironmentByGlobals,
  removeGlobalsWithAreCoveredByEnv,
  transformEnvAndGlobals,
} from './env_globals.js';
import { Config, OxlintConfig } from './types.js';
import globals from 'globals';

describe('detectEnvironmentByGlobals', () => {
  test('detect es2024', () => {
    const config: OxlintConfig = {
      globals: globals.es2024,
    };

    detectEnvironmentByGlobals(config);
    expect(config.env?.es2024).toBe(true);
  });

  test('does not detect unsupported es version', () => {
    const config: OxlintConfig = {
      globals: globals.es3,
    };

    detectEnvironmentByGlobals(config);
    expect(config.env).toBeUndefined();
  });

  test('detect browser env with >=97% match (missing a few keys)', () => {
    // Create a copy of browser globals and remove a few keys to simulate version differences
    const browserGlobals: Record<string, boolean | 'readonly' | 'writable'> = {
      ...globals.browser,
    };
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
    const browserGlobals: Record<string, boolean | 'readonly' | 'writable'> = {
      ...globals.browser,
    };
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
      globals: globals.es2024,
    };

    removeGlobalsWithAreCoveredByEnv(config);
    expect(config.globals).toBeUndefined();
  });
});

describe('transformEnvAndGlobals', () => {
  test('transform languageOptions.ecmaVersion 2024 to env', () => {
    const eslintConfig: Config = {
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
    const eslintConfig: Config = {
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

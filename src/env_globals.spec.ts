import { describe, expect, test } from 'vitest';
import {
  cleanUpSupersetEnvs,
  cleanUpUselessOverridesEnv,
  detectEnvironmentByGlobals,
  removeGlobalsWithAreCoveredByEnv,
  transformEnvAndGlobals,
} from './env_globals.js';
import { OxlintConfig } from './types.js';
import globals from 'globals';
import type { Linter } from 'eslint';

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
    const eslintConfig: Linter.Config = {
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
    const eslintConfig: Linter.Config = {
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

  test('does not removes shared-node-browser when node is false', () => {
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
});

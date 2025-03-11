import { describe, expect, test } from 'vitest';
import {
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

  test('transform latest languageOptions.ecmaVersion to 24024', () => {
    const eslintConfig: Linter.Config = {
      languageOptions: {
        ecmaVersion: 'latest',
      },
    };

    const config: OxlintConfig = {};
    transformEnvAndGlobals(eslintConfig, config);

    expect(config).toStrictEqual({
      env: {
        es2025: true,
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

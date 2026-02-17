import globals from 'globals';
import {
  Config,
  GlobalAccess,
  Options,
  OxlintConfig,
  OxlintConfigOrOverride,
} from './types.js';

// <https://github.com/oxc-project/javascript-globals/blob/55be079bd9ac417b7d5007723beb7aa59193dbd0/xtask/src/main.rs#L121-L136>
export const ES_VERSIONS = [
  6, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026,
];

// <https://github.com/oxc-project/javascript-globals/blob/705cddede9e1bad081a0e7977aea3d3142e4d60f/xtask/src/main.rs#L153-L182>
const OTHER_SUPPORTED_ENVS = [
  'browser',
  'node',
  'shared-node-browser',
  'worker',
  'serviceworker',

  'amd',
  'applescript',
  'astro',
  'atomtest',
  'audioworklet',
  'commonjs',
  'embertest',
  'greasemonkey',
  'jasmine',
  'jest',
  'jquery',
  'meteor',
  'mocha',
  'mongo',
  'nashorn',
  'protractor',
  'prototypejs',
  'phantomjs',
  'shelljs',
  'svelte',
  'webextensions',
  'qunit',
  'vitest',
  'vue',
];

// these parsers are supported by oxlint and should not be reported
const SUPPORTED_ESLINT_PARSERS = ['typescript-eslint/parser'];

const normalizeGlobValue = (value: GlobalAccess): boolean | undefined => {
  if (value === 'readable' || value === 'readonly' || value === false) {
    return false;
  }

  if (value === 'off') {
    return undefined;
  }

  return true;
};

// In Eslint v9 there are no envs and all are build in with `globals` package
// we look what environment is supported and remove all globals which fall under it
export const removeGlobalsWithAreCoveredByEnv = (
  config: OxlintConfigOrOverride
) => {
  if (config.globals === undefined || config.env === undefined) {
    return;
  }

  for (const [env, entries] of Object.entries(globals)) {
    if (config.env[env] === true) {
      for (const entry of Object.keys(entries)) {
        // @ts-expect-error -- filtering makes the key to any
        if (normalizeGlobValue(config.globals[entry]) === entries[entry]) {
          delete config.globals[entry];
        }
      }
    }
  }

  if (Object.keys(config.globals).length === 0) {
    delete config.globals;
  }
};

export const transformBoolGlobalToString = (config: OxlintConfigOrOverride) => {
  if (config.globals === undefined) {
    return;
  }

  for (const [entry, value] of Object.entries(config.globals)) {
    if (value === false || value === 'readable') {
      config.globals[entry] = 'readonly';
    } else if (value === true || value === 'writeable') {
      config.globals[entry] = 'writable';
    }
  }
};

// Environments we want to apply a threshold match for, because they're quite large.
const THRESHOLD_ENVS = ['browser', 'node', 'serviceworker', 'worker'];

export const detectEnvironmentByGlobals = (config: OxlintConfigOrOverride) => {
  if (config.globals === undefined) {
    return;
  }

  for (const [env, entries] of Object.entries(globals)) {
    if (!env.startsWith('es') && !OTHER_SUPPORTED_ENVS.includes(env)) {
      continue;
    }

    // skip unsupported oxlint EcmaScript versions
    if (
      env.startsWith('es') &&
      !ES_VERSIONS.includes(parseInt(env.replace(/^es/, '')))
    ) {
      continue;
    }

    let search = Object.keys(entries);

    let matches = search.filter(
      (entry) =>
        // @ts-expect-error -- we already checked for undefined
        entry in config.globals &&
        // @ts-expect-error -- filtering makes the key to any
        normalizeGlobValue(config.globals[entry]) === entries[entry]
    );

    // For especially large globals, we allow a match if >=97% of keys match.
    // This lets us handle version differences in globals package where
    // there's a difference of just a few extra/removed keys.
    // Do not do any other envs, otherwise things like es2024 and es2026
    // would match each other.
    const useThreshold = THRESHOLD_ENVS.includes(env);

    const withinThreshold =
      useThreshold && matches.length / search.length >= 0.97;

    if (
      withinThreshold ||
      (!useThreshold && matches.length === search.length)
    ) {
      if (config.env === undefined) {
        config.env = {};
      }
      config.env[env] = true;
    }
  }
};

export const transformEnvAndGlobals = (
  eslintConfig: Config,
  targetConfig: OxlintConfigOrOverride,
  options?: Options
): void => {
  if (
    eslintConfig.languageOptions?.parser !== undefined &&
    eslintConfig.languageOptions?.parser !== null &&
    typeof eslintConfig.languageOptions.parser === 'object' &&
    'meta' in eslintConfig.languageOptions.parser &&
    !(SUPPORTED_ESLINT_PARSERS as (string | undefined)[]).includes(
      // @ts-expect-error
      eslintConfig.languageOptions.parser.meta?.name
    )
  ) {
    options?.reporter?.addWarning(
      'special parser detected: ' +
        // @ts-expect-error
        eslintConfig.languageOptions.parser.meta?.name
    );
  }

  if (
    eslintConfig.languageOptions?.globals !== undefined &&
    eslintConfig.languageOptions?.globals !== null
  ) {
    if (targetConfig.globals === undefined) {
      targetConfig.globals = {};
    }

    // when upgrading check if the global already exists and do not write
    if (options?.merge) {
      for (const [global, globalSetting] of Object.entries(
        eslintConfig.languageOptions.globals
      )) {
        if (!(global in targetConfig.globals)) {
          targetConfig.globals[global] = globalSetting;
        }
      }
    } else {
      // no merge, hard append
      Object.assign(targetConfig.globals, eslintConfig.languageOptions.globals);
    }
  }

  if (eslintConfig.languageOptions?.ecmaVersion !== undefined) {
    if (eslintConfig.languageOptions.ecmaVersion === 'latest') {
      if (targetConfig.env === undefined) {
        targetConfig.env = {};
      }
      const latestVersion = `es${ES_VERSIONS[ES_VERSIONS.length - 1]}`;
      if (!(latestVersion in targetConfig.env)) {
        targetConfig.env[latestVersion] = true;
      }
    } else if (
      typeof eslintConfig.languageOptions.ecmaVersion === 'number' &&
      ES_VERSIONS.includes(eslintConfig.languageOptions.ecmaVersion)
    ) {
      if (targetConfig.env === undefined) {
        targetConfig.env = {};
      }
      const targetVersion = `es${eslintConfig.languageOptions.ecmaVersion}`;
      if (!(targetVersion in targetConfig.env)) {
        targetConfig.env[targetVersion] = true;
      }
    }
  }
};

export const cleanUpUselessOverridesEnv = (config: OxlintConfig): void => {
  if (config.env === undefined || config.overrides === undefined) {
    return;
  }

  for (const override of config.overrides) {
    if (override.env === undefined) {
      continue;
    }

    for (const [overrideEnv, overrideEnvConfig] of Object.entries(
      override.env
    )) {
      if (
        overrideEnv in config.env &&
        config.env[overrideEnv] === overrideEnvConfig
      ) {
        delete override.env[overrideEnv];
      }
    }

    if (Object.keys(override.env).length === 0) {
      delete override.env;
    }
  }
};

// These are envs where the key includes all of the globals from the values.
// So for example, for shared-node-browser, if the user has either `node` or `browser` already in their `env`, we can remove `shared-node-browser`.
const SUPERSET_ENVS: Record<string, string[]> = {
  node: ['nodeBuiltin', 'shared-node-browser', 'commonjs'],
  browser: ['shared-node-browser'],
};

/**
 * Cleans up superset environments in the config and its overrides.
 * If a superset environment is present, its subset environments are removed, e.g. all globals from `shared-node-browser` are also in `browser` and `node`.
 *
 * This also applies for overrides, where if a superset env is defined in the override or main config,
 * the subset envs can be removed from the override if the override has the same value as the superset.
 */
export const cleanUpSupersetEnvs = (config: OxlintConfig): void => {
  // Clean up main config env
  if (config.env !== undefined) {
    // If we have a superset env, remove its subsets
    for (const [supersetEnv, subsetEnvs] of Object.entries(SUPERSET_ENVS)) {
      if (!(supersetEnv in config.env)) {
        continue;
      }

      for (const subsetEnv of subsetEnvs) {
        if (config.env[subsetEnv] === config.env[supersetEnv]) {
          delete config.env[subsetEnv];
        }
      }
    }
  }

  // Clean up overrides
  if (config.overrides !== undefined) {
    for (const override of config.overrides) {
      if (override.env === undefined) {
        continue;
      }

      for (const [supersetEnv, subsetEnvs] of Object.entries(SUPERSET_ENVS)) {
        // Check if the superset env is in the override
        const supersetInOverride = supersetEnv in override.env;
        const supersetInMain =
          config.env !== undefined && supersetEnv in config.env;

        for (const subsetEnv of subsetEnvs) {
          if (!(subsetEnv in override.env)) {
            continue;
          }

          // Case 1: Both superset and subset are in the override with the same value
          // We can safely remove the subset
          if (
            supersetInOverride &&
            override.env[subsetEnv] === override.env[supersetEnv]
          ) {
            delete override.env[subsetEnv];
            continue;
          }

          // Case 2: Superset is in main config, subset is in override
          // If they have the same value, the subset is redundant
          if (
            supersetInMain &&
            !supersetInOverride &&
            config.env![supersetEnv] === override.env[subsetEnv]
          ) {
            delete override.env[subsetEnv];
          }
        }
      }

      // Clean up empty env object
      if (Object.keys(override.env).length === 0) {
        delete override.env;
      }
    }
  }
};

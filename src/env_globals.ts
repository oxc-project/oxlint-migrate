import globals from 'globals';
import { Options, OxlintConfig, OxlintConfigOrOverride } from './types.js';
import type { Linter } from 'eslint';

// <https://github.com/oxc-project/javascript-globals/blob/55be079bd9ac417b7d5007723beb7aa59193dbd0/xtask/src/main.rs#L121-L136>
export const ES_VERSIONS = [
  6, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026,
];

// <https://github.com/oxc-project/javascript-globals/blob/55be079bd9ac417b7d5007723beb7aa59193dbd0/xtask/src/main.rs#L136-L162>
const OTHER_SUPPORTED_ENVS = [
  'browser',
  'node',
  'shared-node-browser',
  'worker',
  'serviceworker',

  'amd',
  'applescript',
  'atomtest',
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
  'webextensions',
  'qunit',
  'vitest',
];

// these parsers are supported by oxlint and should not be reported
const SUPPORTED_ESLINT_PARSERS = ['typescript-eslint/parser'];

const normalizeGlobValue = (value: Linter.GlobalConf): boolean | undefined => {
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
        // @ts-ignore -- filtering makes the key to any
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
    } else if (value === true || value === 'writable') {
      config.globals[entry] = 'writeable';
    }
  }
};

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
        // @ts-ignore -- we already checked for undefined
        entry in config.globals &&
        // @ts-ignore -- filtering makes the key to any
        normalizeGlobValue(config.globals[entry]) === entries[entry]
    );
    if (search.length === matches.length) {
      if (config.env === undefined) {
        config.env = {};
      }
      config.env[env] = true;
    }
  }
};

export const transformEnvAndGlobals = (
  eslintConfig: Linter.Config,
  targetConfig: OxlintConfigOrOverride,
  options?: Options
): void => {
  if (
    eslintConfig.languageOptions?.parser !== undefined &&
    eslintConfig.languageOptions?.parser !== null &&
    typeof eslintConfig.languageOptions.parser === 'object' &&
    'meta' in eslintConfig.languageOptions.parser &&
    !(SUPPORTED_ESLINT_PARSERS as (string | undefined)[]).includes(
      // @ts-ignore
      eslintConfig.languageOptions.parser.meta?.name
    )
  ) {
    options?.reporter !== undefined &&
      options.reporter(
        'special parser detected: ' +
          // @ts-ignore
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

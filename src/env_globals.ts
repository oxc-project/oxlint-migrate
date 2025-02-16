import globals from 'globals';
import { OxlintConfig, OxlintConfigOrOverride, Reporter } from './types.js';
import type { Linter } from 'eslint';

export const ES_VERSIONS = [
  6, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025,
];

// <https://github.com/oxc-project/oxc/blob/addaa8e0a3f8682982368f1f325d99af8da952f2/tasks/javascript_globals/src/main.rs>
const OTHER_SUPPORTED_ENVS = [
  'browser',
  'node',
  'shared-node-browser',
  'worker',
  'serviceworker',
  'commonjs',
  'amd',
  'mocha',
  'jasmine',
  'jest',
  'phantomjs',
  'jquery',
  'qunit',
  'prototypejs',
  'shelljs',
  'meteor',
  'mongo',
  'protractor',
  'applescript',
  'nashorn',
  'atomtest',
  'embertest',
  'webextensions',
  'greasemonkey',
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
};

export const transformBoolGlobalToString = (config: OxlintConfigOrOverride) => {
  if (config.globals === undefined) {
    return;
  }

  for (const [entry, value] of Object.entries(config.globals)) {
    if (value === false) {
      config.globals[entry] = 'readonly';
    } else if (value === true) {
      config.globals[entry] = 'writable';
    }
  }
};

export const detectEnvironmentByGlobals = (config: OxlintConfigOrOverride) => {
  if (config.globals === undefined) {
    return;
  }

  // ToDo: only check for envs which are supported by oxlint
  for (const [env, entries] of Object.entries(globals)) {
    if (!env.startsWith('es') && !OTHER_SUPPORTED_ENVS.includes(env)) {
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
  reporter?: Reporter
): void => {
  if (
    eslintConfig.languageOptions?.parser !== undefined &&
    !SUPPORTED_ESLINT_PARSERS.includes(
      eslintConfig.languageOptions.parser.meta?.name!
    )
  ) {
    reporter !== undefined &&
      reporter(
        'special parser detected: ' +
          eslintConfig.languageOptions.parser.meta?.name
      );
  }

  if (eslintConfig.languageOptions?.globals !== undefined) {
    if (targetConfig.globals === undefined) {
      targetConfig.globals = {};
    }

    Object.assign(targetConfig.globals, eslintConfig.languageOptions.globals);
  }

  if (eslintConfig.languageOptions?.ecmaVersion !== undefined) {
    if (targetConfig.globals === undefined) {
      targetConfig.globals = {};
    }

    if (eslintConfig.languageOptions?.ecmaVersion === 'latest') {
      if (targetConfig.env === undefined) {
        targetConfig.env = {};
      }
      targetConfig.env[`es${ES_VERSIONS[ES_VERSIONS.length - 1]}`] = true;
    } else if (
      ES_VERSIONS.includes(eslintConfig.languageOptions?.ecmaVersion)
    ) {
      if (targetConfig.env === undefined) {
        targetConfig.env = {};
      }
      targetConfig.env[`es${eslintConfig.languageOptions?.ecmaVersion}`] = true;
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

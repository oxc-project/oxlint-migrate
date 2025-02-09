
import globals from 'globals';
import { OxlintConfig } from "./types.js";
import type { Linter } from 'eslint';

export const ES_VERSIONS = [6, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025];

const normalizeGlobValue = (value: Linter.GlobalConf) :boolean | undefined => {
    if (value === 'readable' || value === 'readonly' || value === false) {
        return false;
    }

    if (value === 'off') {
        return undefined;
    }

    return true;
}

// In Eslint v9 there are no envs and all are build in with `globals` package
// we look what environment is supported and remove all globals which fall under it
export const removeGlobalsWithAreCoveredByEnv = (config: OxlintConfig) => {
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

export const detectEnvironmentByGlobals = (config: OxlintConfig) => {
  if (config.globals === undefined) {
    return;
  }

  // ToDo: only check for envs which are supported by oxlint
  for (const [env, entries] of Object.entries(globals)) {
    let search = Object.keys(entries);
    let matches = search.filter(
      (entry) =>
        // @ts-ignore -- filtering makes the key to any
        normalizeGlobValue(config.globals![entry]) === entries[entry]
    );
    if (search.length === matches.length) {
      if (config.env === undefined) {
        config.env = {};
      }
      config.env[env] = true;
    }
  }
};
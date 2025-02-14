import {
  ES_VERSIONS,
  removeGlobalsWithAreCoveredByEnv,
  transformBoolGlobalToString,
} from './env_globals.js';
import {
  OxlintConfigOrOverride,
  OxlintConfig,
  OxlintConfigOverride,
} from './types.js';

// thanks to https://stackoverflow.com/a/77278013/7387397
const isEqualDeep = <T>(a: T, b: T): boolean => {
  if (a === b) {
    return true;
  }

  const bothAreObjects =
    a && b && typeof a === 'object' && typeof b === 'object';

  return Boolean(
    bothAreObjects &&
      Object.keys(a).length === Object.keys(b).length &&
      Object.entries(a).every(([k, v]) => isEqualDeep(v, b[k as keyof T]))
  );
};

const TS_ESLINT_DEFAULT_OVERRIDE: OxlintConfigOverride = {
  files: ['**/*.ts', '**/*.tsx', '**/*.mts', '**/*.cts'],
  rules: {
    'constructor-super': 'off',
    'getter-return': 'off',
    'no-class-assign': 'off',
    'no-const-assign': 'off',
    'no-dupe-class-members': 'off',
    'no-dupe-keys': 'off',
    'no-func-assign': 'off',
    'no-import-assign': 'off',
    'no-new-native-nonconstructor': 'off',
    'no-obj-calls': 'off',
    'no-redeclare': 'off',
    'no-setter-return': 'off',
    'no-this-before-super': 'off',
    'no-undef': 'off',
    'no-unreachable': 'off',
    'no-unsafe-negation': 'off',
    'no-var': 'error',
    'prefer-rest-params': 'error',
    'prefer-spread': 'error',
  },
};

const cleanUpDefaultTypeScriptOverridesForEslint = (
  config: OxlintConfig
): void => {
  if (config.overrides === undefined) {
    return;
  }

  const indexesToDelete: string[] = [];

  for (const index in config.overrides) {
    const override = config.overrides[index];
    if (isEqualDeep(override, TS_ESLINT_DEFAULT_OVERRIDE)) {
      indexesToDelete.push(index);
    }
  }

  // @ts-ignore -- TS Gods please help me to survive this madness
  indexesToDelete.forEach((index) => delete config.overrides![index]);

  if (Object.keys(config.overrides).length === 0) {
    delete config.overrides;
  }
};

const cleanUpUselessOverridesEntries = (config: OxlintConfig): void => {
  if (config.overrides === undefined) {
    return;
  }

  config.overrides = config.overrides.filter(
    (overrides) => Object.keys(overrides).length > 0
  );

  if (config.plugins !== undefined) {
    for (const override of config.overrides) {
      if (override.plugins === undefined) {
        continue;
      }

      override.plugins = override.plugins.filter(
        (overridePlugin) => !config.plugins!.includes(overridePlugin)
      );

      if (override.plugins.length === 0) {
        delete override.plugins;
      }
    }
  }

  if (config.env !== undefined) {
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
  }

  if (config.overrides.length === 0) {
    delete config.overrides;
  }
};

export const cleanUpOxlintConfig = (config: OxlintConfigOrOverride): void => {
  removeGlobalsWithAreCoveredByEnv(config);
  transformBoolGlobalToString(config);

  // no entries in globals, we can remove the globals key
  if (
    config.globals !== undefined &&
    Object.keys(config.globals).length === 0
  ) {
    delete config.globals;
  }

  if (config.env !== undefined) {
    // these are not supported by oxlint
    delete config.env.es3;
    delete config.env.es5;
    delete config.env.es2015;

    let detected = false;
    // remove older es versions,
    // because newer ones are always a superset of them
    for (const esVersion of ES_VERSIONS.reverse()) {
      if (detected) {
        delete config.env[`es${esVersion}`];
      } else if (config.env[`es${esVersion}`] === true) {
        detected = true;
      }
    }
  }

  if (config.rules !== undefined && Object.keys(config.rules).length === 0) {
    delete config.rules;
  }

  if ('files' in config) {
    if (
      config.plugins !== undefined &&
      Object.keys(config.plugins).length === 0
    ) {
      delete config.plugins;
    }

    // the only key left is
    if (Object.keys(config).length === 1) {
      // @ts-ignore -- what?
      delete config.files;
    }
  } else {
    cleanUpDefaultTypeScriptOverridesForEslint(config);
    cleanUpUselessOverridesEntries(config);
  }
};

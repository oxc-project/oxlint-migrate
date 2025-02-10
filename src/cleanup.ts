import { ES_VERSIONS } from './env_globals.js';
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

  indexesToDelete.forEach(index => delete config.overrides![index as string]);

  if (Object.keys(config.overrides).length === 0) {
    delete config.overrides;
  }
};

export const cleanUpOxlintConfig = (config: OxlintConfigOrOverride): void => {
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

  if (!('files' in config)) {
    cleanUpDefaultTypeScriptOverridesForEslint(config);
  }
  // the only key left is
  if (Object.keys(config).length === 1 && 'files' in config) {
    // @ts-ignore -- what?
    delete config.files;
  }
};

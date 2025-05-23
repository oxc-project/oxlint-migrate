import {
  cleanUpUselessOverridesEnv,
  ES_VERSIONS,
  removeGlobalsWithAreCoveredByEnv,
  transformBoolGlobalToString,
} from './env_globals.js';
import {
  cleanUpRulesWhichAreCoveredByCategory,
  cleanUpUselessOverridesPlugins,
  cleanUpUselessOverridesRules,
  replaceNodePluginName,
  replaceTypescriptAliasRules,
} from './plugins_rules.js';
import {
  OxlintConfigOrOverride,
  OxlintConfig,
  OxlintConfigOverride,
} from './types.js';
import { isEqualDeep } from './utilities.js';

const TS_ESLINT_DEFAULT_OVERRIDE: OxlintConfigOverride = {
  files: ['**/*.ts', '**/*.tsx', '**/*.mts', '**/*.cts'],
  rules: {
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

  config.overrides = config.overrides.filter(
    (overrides) => Object.keys(overrides).length > 0
  );

  if (Object.keys(config.overrides).length === 0) {
    delete config.overrides;
  }
};

const cleanUpUselessOverridesEntries = (config: OxlintConfig): void => {
  cleanUpDefaultTypeScriptOverridesForEslint(config);
  cleanUpUselessOverridesRules(config);
  cleanUpUselessOverridesPlugins(config);
  cleanUpUselessOverridesEnv(config);

  if (config.overrides === undefined) {
    return;
  }

  for (const overrideIndex in config.overrides) {
    // the only key left is
    if (Object.keys(config.overrides[overrideIndex]).length === 1) {
      delete config.overrides[overrideIndex];
    }
  }

  config.overrides = config.overrides.filter(
    (overrides) => Object.keys(overrides).length > 0
  );

  if (config.overrides.length === 0) {
    delete config.overrides;
  }
};

export const cleanUpOxlintConfig = (config: OxlintConfigOrOverride): void => {
  removeGlobalsWithAreCoveredByEnv(config);
  transformBoolGlobalToString(config);
  replaceTypescriptAliasRules(config);
  replaceNodePluginName(config);
  cleanUpRulesWhichAreCoveredByCategory(config);

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
    for (const esVersion of [...ES_VERSIONS].reverse()) {
      if (detected) {
        delete config.env[`es${esVersion}`];
      } else if (config.env[`es${esVersion}`] === true) {
        detected = true;
      }
    }
  }

  if (!('files' in config)) {
    cleanUpUselessOverridesEntries(config);
  }
};

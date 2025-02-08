import type { Linter } from 'eslint';
import globals from 'globals';

type OxlintConfigPlugins = string[];
type OxlintConfigCategories = Record<string, unknown>;
type OxlintConfigEnv = Record<string, boolean>;
type OxlintConfigIgnorePatterns = string[];
type OxlintConfigOverride = {
  files: string[];
  env?: OxlintConfigEnv;
  globals?: Linter.Globals;
  rules?: Partial<Linter.RulesRecord>;
};

type OxlintConfig = {
  env?: OxlintConfigEnv;
  globals?: Linter.Globals;
  plugins?: OxlintConfigPlugins;
  categories?: OxlintConfigCategories;
  rules: Partial<Linter.RulesRecord>;
  overrides?: OxlintConfigOverride[];
  ignorePatterns?: OxlintConfigIgnorePatterns;
};

const transformRuleEntry = (
  extendable: Partial<Linter.RulesRecord>,
  rulesToExtend: Partial<Linter.RulesRecord>
) => {
  for (const [rule, config] of Object.entries(rulesToExtend)) {
    // ToDo: check if the rule is really supported by oxlint
    // when not ask the user if this is ok
    // maybe put it still into the jsonc file but commented out

    // ToDo: check if we need to enable a oxlint plugin
    extendable[rule] = config;
  }
};

// In Eslint v9 there are no envs and all are build in with `globals` package
// we look what environment is supported and remove all globals which fall under it
const removeGlobalsWithAreCoveredByEnv = (config: OxlintConfig) => {
  if (config.globals === undefined || config.env === undefined) {
    return;
  }

  for (const [env, entries] of Object.entries(globals)) {
    if (config.env[env] === true) {
      for (const entry of Object.keys(entries)) {
        // @ts-ignore -- filtering makes the key to any
        if (config.globals[entry] == entries[entry]) {
          delete config.globals[entry];
        }
      }
    }
  }
};

const detectEnvironmentByGlobals = (config: OxlintConfig) => {
  if (config.globals === undefined) {
    return;
  }

  for (const [env, entries] of Object.entries(globals)) {
    let search = Object.keys(entries);
    let matches = search.filter(
      (entry) =>
        // @ts-ignore -- filtering makes the key to any
        config.globals![entry] == entries[entry]
    );
    if (search.length === matches.length) {
      if (config.env === undefined) {
        config.env = {};
      }
      config.env[env] = true;
    }
  }
};

const buildConfig = (configs: Linter.Config[]): OxlintConfig => {
  const oxlintConfig: OxlintConfig = {
    env: {
      builtin: true,
    },
    rules: {},
  };
  const overrides: OxlintConfigOverride[] = [];

  for (const config of configs) {
    // we are ignoring oxlint eslint plugin
    if (config.name?.startsWith('oxlint')) {
      continue;
    }

    // target the base config or create an override config
    let targetConfig: OxlintConfig | OxlintConfigOverride;

    if (config.files === undefined) {
      targetConfig = oxlintConfig;
    } else {
      targetConfig = {
        files: (Array.isArray(config.files)
          ? config.files
          : [config.files]) as string[],
      };
      overrides.push(targetConfig as OxlintConfigOverride);
    }

    // ToDo: check if we need to enable some plugins
    if (config.plugins !== undefined) {
    }

    if (config.ignores !== undefined) {
      oxlintConfig.ignorePatterns = config.ignores;
    }

    if (config.rules !== undefined) {
      if (targetConfig.rules === undefined) {
        targetConfig.rules = {};
      }
      transformRuleEntry(targetConfig.rules, config.rules);
    }

    if (config.languageOptions?.globals !== undefined) {
      if (targetConfig.globals === undefined) {
        targetConfig.globals = {};
      }

      Object.assign(targetConfig.globals, config.languageOptions.globals);
    }

    if (config.languageOptions?.ecmaVersion !== undefined) {
      if (targetConfig.globals === undefined) {
        targetConfig.globals = {};
      }

      // ToDo: we are only appending globals to the main config
      // overrides configs are not able to
      if (config.languageOptions?.ecmaVersion === 'latest') {
        if (targetConfig.env === undefined) {
          targetConfig.env = {};
        }
        targetConfig.env['es2024'] = true;
      } else if (
        [6, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024].includes(
          config.languageOptions?.ecmaVersion
        )
      ) {
        if (targetConfig.env === undefined) {
          targetConfig.env = {};
        }
        targetConfig.env[`es${config.languageOptions?.ecmaVersion}`] = true;
      }
    }

    // ToDo: for what?
    if (config.settings !== undefined) {
    }
  }

  if (overrides.length > 0) {
    oxlintConfig.overrides = overrides;
  }

  detectEnvironmentByGlobals(oxlintConfig);
  removeGlobalsWithAreCoveredByEnv(oxlintConfig);

  return oxlintConfig;
};

const main = async (
  configs:
    | Linter.Config
    | Linter.Config[]
    | Promise<Linter.Config>
    | Promise<Linter.Config[]>
): Promise<OxlintConfig> => {
  const resolved = await Promise.resolve(configs);

  if (Array.isArray(resolved)) {
    return buildConfig(resolved);
  }

  return buildConfig([resolved]);
};

export default main;

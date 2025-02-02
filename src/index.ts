import type { Linter } from 'eslint';

type OxlintConfigPlugins = string[];
type OxlintConfigCategories = Record<string, unknown>;
type OxlintConfigEnv = Record<string, boolean>;
type OxlintConfigIgnorePatterns = string[];
type OxlintConfigOverride = {
  files: string[];
  rules: Partial<Linter.RulesRecord>;
};

type OxlintConfig = {
  env: OxlintConfigEnv;
  plugins?: OxlintConfigPlugins;
  categories?: OxlintConfigCategories;
  rules: Partial<Linter.RulesRecord>;
  overrides?: OxlintConfigOverride[];
  ignorePatterns?: OxlintConfigIgnorePatterns;
  globals?: Linter.Globals;
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
        rules: {},
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
      transformRuleEntry(targetConfig.rules, config.rules);
    }

    if (config.languageOptions?.globals !== undefined) {
      if (oxlintConfig.globals === undefined) {
        oxlintConfig.globals = {};
      }

      // ToDo: we are only appending globals to the main config
      // overrides configs are not able to
      Object.assign(oxlintConfig.globals, config.languageOptions.globals);
    }

    if (config.languageOptions?.ecmaVersion !== undefined) {
      if (oxlintConfig.globals === undefined) {
        oxlintConfig.globals = {};
      }

      // ToDo: we are only appending globals to the main config
      // overrides configs are not able to
      if (config.languageOptions?.ecmaVersion === 'latest') {
        oxlintConfig.env['es2024'] = true;
      } else if (
        [6, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024].includes(
          config.languageOptions?.ecmaVersion
        )
      ) {
        oxlintConfig.env[`es${config.languageOptions?.ecmaVersion}`] = true;
      }
    }

    // ToDo: for what?
    if (config.settings !== undefined) {
    }
  }

  if (overrides.length > 0) {
    oxlintConfig.overrides = overrides;
  }

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

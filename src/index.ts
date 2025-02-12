import type { Linter } from 'eslint';
import { OxlintConfig, OxlintConfigOverride, Problems } from './types.js';
import {
  detectEnvironmentByGlobals,
  transformEnvAndGlobals,
} from './env_globals.js';
import { cleanUpOxlintConfig } from './cleanup.js';
import { transformIgnorePatterns } from './ignorePatterns.js';
import {
  detectNeededRulesPlugins,
  transformRuleEntry,
} from './plugins_rules.js';

const buildConfig = (configs: Linter.Config[]): [OxlintConfig, Problems] => {
  const oxlintConfig: OxlintConfig = {
    // disable all plugins and check later
    plugins: [],
    env: {
      builtin: true,
    },
    categories: {
      // default category
      correctness: 'off',
    },
  };
  const overrides: OxlintConfigOverride[] = [];
  const problems: Problems = {
    unsupportedRules: [],
    unsupportedParsers: [],
    unsupportedIgnore: [],
    unsupportedPlugins: [],
  };

  for (const config of configs) {
    // we are ignoring oxlint eslint plugin
    if (config.name?.startsWith('oxlint/')) {
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

    // ToDo: for what?
    if (config.settings !== undefined) {
    }

    transformIgnorePatterns(config, targetConfig, problems.unsupportedIgnore);
    transformRuleEntry(config, targetConfig, problems.unsupportedRules);
    transformEnvAndGlobals(config, targetConfig, problems.unsupportedParsers);

    // clean up overrides
    if ('files' in targetConfig) {
      detectNeededRulesPlugins(targetConfig, problems.unsupportedPlugins);

      // ToDo: cleanup for overrides envs which do not change
      // detectEnvironmentByGlobals(targetConfig);
      cleanUpOxlintConfig(targetConfig);
    }
  }

  oxlintConfig.overrides = overrides;

  detectNeededRulesPlugins(oxlintConfig, problems.unsupportedPlugins);
  detectEnvironmentByGlobals(oxlintConfig);
  cleanUpOxlintConfig(oxlintConfig);

  return [oxlintConfig, problems];
};

const main = async (
  configs:
    | Linter.Config
    | Linter.Config[]
    | Promise<Linter.Config>
    | Promise<Linter.Config[]>,
  reporter: ((warning: string) => void) | undefined = undefined
): Promise<OxlintConfig> => {
  const resolved = await Promise.resolve(configs);

  const [config, problems] = Array.isArray(resolved)
    ? buildConfig(resolved)
    : buildConfig([resolved]);

  if (reporter !== undefined) {
    problems.unsupportedIgnore.forEach((error) => reporter(error));
    problems.unsupportedParsers.forEach((error) => reporter(error));
    problems.unsupportedRules.forEach((error) => reporter(error));
    problems.unsupportedPlugins.forEach((error) => reporter(error));
  }

  return config;
};

export default main;

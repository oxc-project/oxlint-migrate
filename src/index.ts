import type { Linter } from 'eslint';
import { OxlintConfig, OxlintConfigOverride, Problems } from './types.js';
import {
  detectEnvironmentByGlobals,
  removeGlobalsWithAreCoveredByEnv,
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

    // ToDo: oxlint does not support it currently in overrides
    transformIgnorePatterns(config, oxlintConfig, problems.unsupportedIgnore);
    transformRuleEntry(config, targetConfig, problems.unsupportedRules);
    transformEnvAndGlobals(config, targetConfig, problems.unsupportedParsers);

    // ToDo: for what?
    if (config.settings !== undefined) {
    }

    detectNeededRulesPlugins(targetConfig, problems.unsupportedPlugins);

    // clean up overrides
    if ('files' in targetConfig) {
      // ToDo: cleanup for overrides envs which do not change
      // detectEnvironmentByGlobals(targetConfig);
      // removeGlobalsWithAreCoveredByEnv(targetConfig);
      cleanUpOxlintConfig(targetConfig);
    }
  }

  oxlintConfig.overrides = overrides;

  detectEnvironmentByGlobals(oxlintConfig);
  removeGlobalsWithAreCoveredByEnv(oxlintConfig);
  cleanUpOxlintConfig(oxlintConfig);

  return [oxlintConfig, problems];
};

const main = async (
  configs:
    | Linter.Config
    | Linter.Config[]
    | Promise<Linter.Config>
    | Promise<Linter.Config[]>,
  reportProblems = false
): Promise<OxlintConfig> => {
  const resolved = await Promise.resolve(configs);

  const [config, problems] = Array.isArray(resolved)
    ? buildConfig(resolved)
    : buildConfig([resolved]);

  if (reportProblems) {
    problems.unsupportedIgnore.forEach(console.warn);
    problems.unsupportedParsers.forEach(console.warn);
    problems.unsupportedRules.forEach(console.warn);
    problems.unsupportedPlugins.forEach(console.warn);
  }

  return config;
};

export default main;

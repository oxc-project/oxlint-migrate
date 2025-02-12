import type { Linter } from 'eslint';
import { OxlintConfig, OxlintConfigOverride, Reporter } from './types.js';
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

const buildConfig = (
  configs: Linter.Config[],
  reporter: Reporter
): OxlintConfig => {
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

    transformIgnorePatterns(config, targetConfig, reporter);
    transformRuleEntry(config, targetConfig, reporter);
    transformEnvAndGlobals(config, targetConfig, reporter);

    // clean up overrides
    if ('files' in targetConfig) {
      detectNeededRulesPlugins(targetConfig, reporter);
      detectEnvironmentByGlobals(targetConfig);
      cleanUpOxlintConfig(targetConfig);
    }
  }

  oxlintConfig.overrides = overrides;

  detectNeededRulesPlugins(oxlintConfig, reporter);
  detectEnvironmentByGlobals(oxlintConfig);
  cleanUpOxlintConfig(oxlintConfig);

  return oxlintConfig;
};

const main = async (
  configs:
    | Linter.Config
    | Linter.Config[]
    | Promise<Linter.Config>
    | Promise<Linter.Config[]>,
  reporter: Reporter = undefined
): Promise<OxlintConfig> => {
  const resolved = await Promise.resolve(configs);

  return Array.isArray(resolved)
    ? buildConfig(resolved, reporter)
    : buildConfig([resolved], reporter);
};

export default main;

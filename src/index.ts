import type { Linter } from 'eslint';
import { Options, OxlintConfig, OxlintConfigOverride } from './types.js';
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
import { detectSameOverride } from './overrides.js';

const buildConfig = (
  configs: Linter.Config[],
  oxlintConfig?: OxlintConfig,
  options?: Options
): OxlintConfig => {
  if (oxlintConfig === undefined) {
    oxlintConfig = {
      $schema: './node_modules/oxlint/configuration_schema.json',
      // disable all plugins and check later
      plugins: [],
      env: {
        builtin: true,
      },
      categories: {
        // ToDo: for upgrade set the default category manuel when it is not found
        // ToDo: later we can remove it again
        // default category
        correctness: 'off',
      },
    };
  }

  // when upgrade check if $schema is not defined,
  // the default config has already defined it
  if (oxlintConfig.$schema === undefined && options?.upgrade) {
    oxlintConfig.$schema = './node_modules/oxlint/configuration_schema.json';
  }

  // when upgrade use the existing overrides, or else create an empty one
  const overrides: OxlintConfigOverride[] = options?.upgrade
    ? (oxlintConfig.overrides ?? [])
    : [];

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
      // ToDo: (when upgrade) check if config.files matches already existing overrides
      targetConfig = {
        files: (Array.isArray(config.files)
          ? config.files
          : [config.files]) as string[],
      };
      const [push, result] = detectSameOverride(oxlintConfig, targetConfig);

      if (push) {
        overrides.push(result);
      }
    }

    // ToDo: check if we need to enable some plugins
    if (config.plugins !== undefined) {
    }

    // ToDo: for what?
    if (config.settings !== undefined) {
    }

    transformIgnorePatterns(config, targetConfig, options);
    transformRuleEntry(config, targetConfig, options);
    transformEnvAndGlobals(config, targetConfig, options);

    // clean up overrides
    if ('files' in targetConfig) {
      detectNeededRulesPlugins(targetConfig, options);
      detectEnvironmentByGlobals(targetConfig);
      cleanUpOxlintConfig(targetConfig);
    }
  }

  oxlintConfig.overrides = overrides;

  detectNeededRulesPlugins(oxlintConfig, options);
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
  oxlintConfig?: OxlintConfig,
  options?: Options
): Promise<OxlintConfig> => {
  const resolved = await Promise.resolve(configs);

  return Array.isArray(resolved)
    ? buildConfig(resolved, oxlintConfig, options)
    : buildConfig([resolved], oxlintConfig, options);
};

export default main;

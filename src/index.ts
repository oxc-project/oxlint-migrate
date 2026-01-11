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
import fixForJsPlugins from './js_plugin_fixes.js';
import { processConfigFiles } from './files.js';

const buildConfig = (
  configs: Linter.Config[],
  oxlintConfig?: OxlintConfig,
  options?: Options
): OxlintConfig => {
  if (oxlintConfig === undefined) {
    // when upgrading and no configuration is found, we use the default configuration from oxlint
    if (options?.merge) {
      oxlintConfig = {
        // disable all plugins and check later
        plugins: ['oxc', 'typescript', 'unicorn', 'react'],
        categories: {
          correctness: 'warn',
        },
      };
    } else {
      // when no merge we start from 0 rules
      oxlintConfig = {
        $schema: './node_modules/oxlint/configuration_schema.json',
        // disable all plugins and check later
        plugins: [],
        categories: {
          // ToDo: for merge set the default category manuel when it is not found
          // ToDo: later we can remove it again
          // default category
          correctness: 'off',
        },
      };
    }
  }

  // when merge check if $schema is not defined,
  // the default config has already defined it
  if (oxlintConfig.$schema === undefined && options?.merge) {
    oxlintConfig.$schema = './node_modules/oxlint/configuration_schema.json';
  }

  // when upgrading check for env default
  // the default config has already defined it
  if (oxlintConfig.env?.builtin === undefined) {
    if (oxlintConfig.env === undefined) {
      oxlintConfig.env = {};
    }
    oxlintConfig.env.builtin = true;
  }

  // when merge use the existing overrides, or else create an empty one
  const overrides: OxlintConfigOverride[] = options?.merge
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
      const { validFiles, shouldSkip } = processConfigFiles(
        config.files,
        options?.reporter
      );

      // If no valid files remain after filtering nested arrays, skip this config
      if (shouldSkip) {
        continue;
      }

      targetConfig = {
        files: validFiles,
      };
      const [push, result] = detectSameOverride(oxlintConfig, targetConfig);

      if (push) {
        overrides.push(result);
      }
    }

    transformIgnorePatterns(config, targetConfig, options);
    transformRuleEntry(config, targetConfig, options);
    transformEnvAndGlobals(config, targetConfig, options);

    // clean up overrides
    if ('files' in targetConfig) {
      detectNeededRulesPlugins(targetConfig);
      detectEnvironmentByGlobals(targetConfig);
      cleanUpOxlintConfig(targetConfig);
    }
  }

  oxlintConfig.overrides = overrides;

  detectNeededRulesPlugins(oxlintConfig);
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
  const resolved = await Promise.resolve(fixForJsPlugins(configs));
  const resolvedConfigs = Array.isArray(resolved) ? resolved : [resolved];

  return buildConfig(resolvedConfigs, oxlintConfig, options);
};

export default main;

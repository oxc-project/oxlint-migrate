import type { Linter } from 'eslint';
import rules from './generated/rules.js';
import { OxlintConfig, OxlintConfigOverride, Problems } from './types.js';
import {
  detectEnvironmentByGlobals,
  ES_VERSIONS,
  removeGlobalsWithAreCoveredByEnv,
} from './env_globals.js';
import { cleanUpOxlintConfig } from './cleanup.js';

const transformRuleEntry = (
  extendable: Partial<Linter.RulesRecord>,
  rulesToExtend: Partial<Linter.RulesRecord>,
  unsupportedRules: string[]
) => {
  for (const [rule, config] of Object.entries(rulesToExtend)) {
    // ToDo: check if the rule is really supported by oxlint
    // when not ask the user if this is ok
    // maybe put it still into the jsonc file but commented out

    // ToDo: typescript uses `ts/no-unused-expressions`. New Namespace?
    // ToDo: maybe if it is nursery
    if (rules.includes(rule)) {
      extendable[rule] = config;
    } else {
      // ToDo: only report when enabled
      // maybe use a force flag when some enabled rules are detected?
      unsupportedRules.push(`unsupported rule: ${rule}`);
    }
  }
};

const buildConfig = (configs: Linter.Config[]): [OxlintConfig, Problems] => {
  const oxlintConfig: OxlintConfig = {
    env: {
      builtin: true,
    },
  };
  const overrides: OxlintConfigOverride[] = [];
  const problems: Problems = {
    unsupportedRules: [],
    foundSpecialParsers: [],
  };

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
      transformRuleEntry(
        targetConfig.rules,
        config.rules,
        problems.unsupportedRules
      );
    }

    if (config.languageOptions?.parser !== undefined) {
      problems.foundSpecialParsers.push(
        'special parser detected: ' + config.languageOptions.parser.meta?.name
      );
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
      } else if (ES_VERSIONS.includes(config.languageOptions?.ecmaVersion)) {
        if (targetConfig.env === undefined) {
          targetConfig.env = {};
        }
        targetConfig.env[`es${config.languageOptions?.ecmaVersion}`] = true;
      }
    }

    // ToDo: for what?
    if (config.settings !== undefined) {
    }

    // clean up overrides
    if ('files' in targetConfig) {
      cleanUpOxlintConfig(targetConfig);
    }
  }

  let overrides_filtered = overrides.filter(
    (overrides) => Object.keys(overrides).length > 0
  );
  if (overrides_filtered.length > 0) {
    oxlintConfig.overrides = overrides_filtered;
  }

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
    problems.foundSpecialParsers.forEach(console.warn);
    problems.unsupportedRules.forEach(console.warn);
  }

  return config;
};

export default main;

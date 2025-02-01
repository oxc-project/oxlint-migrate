import type { Linter } from 'eslint';

type OxlintConfig = {
  rules: Linter.RulesRecord;
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

const main = (configs: Linter.Config[]): OxlintConfig => {
  const oxlintConfig: OxlintConfig = {
    rules: {},
  };

  for (const config of configs) {
    // ToDo: same when its only for some files
    // maybe move the check out and pass it as a bool to some underline functions
    if (config.files === undefined) {
      // ToDo: check if we need to enable some plugins
      if (config.plugins !== undefined) {
      }

      // ToDo: add to ignorePatterns
      if (config.ignores !== undefined) {
      }

      if (config.rules !== undefined) {
        transformRuleEntry(oxlintConfig.rules, config.rules);
      }

      // ToDo: add globals to oxlint config
      if (config.languageOptions?.globals !== undefined) {
      }

      // ToDo: for what?
      if (config.settings !== undefined) {
      }
    }
  }

  return oxlintConfig;
};

export default main;

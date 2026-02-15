#!/usr/bin/env node

import { program } from 'commander';
import { existsSync, renameSync, writeFileSync, readFileSync } from 'node:fs';
import path from 'node:path';
import {
  getAutodetectedEslintConfigName,
  loadESLintConfig,
} from './config-loader.js';
import main from '../src/index.js';
import packageJson from '../package.json' with { type: 'json' };
import { Options, OxlintConfig } from '../src/types.js';
import { walkAndReplaceProjectFiles } from '../src/walker/index.js';
import { getAllProjectFiles } from './project-loader.js';
import { writeFile } from 'node:fs/promises';
import { preFixForJsPlugins } from '../src/js_plugin_fixes.js';
import { DefaultReporter } from '../src/reporter.js';
import { isOffValue } from '../src/plugins_rules.js';
import {
  formatMigrationOutput,
  displayMigrationResult,
} from './output-formatter.js';

const cwd = process.cwd();

const parseCliBoolean = (value: unknown): boolean =>
  value === 'false' ? false : !!value;

const getFileContent = (absoluteFilePath: string): string | undefined => {
  try {
    return readFileSync(absoluteFilePath, 'utf-8');
  } catch {
    return undefined;
  }
};

/**
 * Count enabled rules (excluding "off" rules) from both rules and overrides
 */
const countEnabledRules = (config: OxlintConfig): number => {
  const enabledRules = new Set<string>();

  if (config.rules) {
    for (const [ruleName, ruleValue] of Object.entries(config.rules)) {
      if (!isOffValue(ruleValue)) {
        enabledRules.add(ruleName);
      }
    }
  }

  if (config.overrides && Array.isArray(config.overrides)) {
    for (const override of config.overrides) {
      if (override.rules) {
        for (const [ruleName, ruleValue] of Object.entries(override.rules)) {
          if (!isOffValue(ruleValue)) {
            enabledRules.add(ruleName);
          }
        }
      }
    }
  }

  return enabledRules.size;
};

program
  .name('oxlint-migrate')
  .version(packageJson.version)
  .argument('[eslint-config]', 'The path to the eslint v9 config file')
  .option(
    '--output-file <file>',
    'The oxlint configuration file where to eslint v9 rules will be written to',
    '.oxlintrc.json'
  )
  .option(
    '--merge',
    'Merge eslint configuration with an existing .oxlintrc.json configuration',
    false
  )
  .option(
    '--with-nursery',
    'Include oxlint rules which are currently under development',
    false
  )
  .option(
    '--replace-eslint-comments',
    'Search in the project files for eslint comments and replaces them with oxlint. Some eslint comments are not supported and will be reported.'
  )
  .option(
    '--type-aware [bool]',
    'Includes supported type-aware rules. Enabled by default; pass `--type-aware=false` to disable.',
    true
  )
  .option(
    '--js-plugins [bool]',
    'Tries to convert unsupported oxlint plugins with `jsPlugins`. Enabled by default; pass `--js-plugins=false` to disable.',
    true
  )
  .option(
    '--details',
    'List rules that could not be migrated to oxlint.',
    false
  )
  .action(async (filePath: string | undefined) => {
    const cliOptions = program.opts();
    const typeAware = parseCliBoolean(cliOptions.typeAware);
    const jsPlugins = parseCliBoolean(cliOptions.jsPlugins);
    const oxlintFilePath = path.join(cwd, cliOptions.outputFile);
    const reporter = new DefaultReporter();

    const options: Options = {
      reporter,
      merge: !!cliOptions.merge,
      withNursery: !!cliOptions.withNursery,
      typeAware,
      jsPlugins,
    };

    if (cliOptions.replaceEslintComments) {
      await walkAndReplaceProjectFiles(
        await getAllProjectFiles(),
        (filePath: string) => getFileContent(filePath),
        (filePath: string, content: string) =>
          writeFile(filePath, content, 'utf-8'),
        options
      );

      // stop the program
      return;
    }

    if (filePath === undefined) {
      filePath = getAutodetectedEslintConfigName(cwd);
    } else {
      filePath = path.join(cwd, filePath);
    }

    if (filePath === undefined) {
      program.error(`could not autodetect eslint config file`);
    }

    const resetPreFix = await preFixForJsPlugins();
    const eslintConfigs = await loadESLintConfig(filePath);
    resetPreFix();

    let config;
    if (options.merge && existsSync(oxlintFilePath)) {
      // we expect that is a right config file
      config = JSON.parse(
        readFileSync(oxlintFilePath, { encoding: 'utf8', flag: 'r' })
      );
    }

    const oxlintConfig =
      'default' in eslintConfigs
        ? await main(eslintConfigs.default, config, options)
        : await main(eslintConfigs, config, options);

    if (existsSync(oxlintFilePath)) {
      renameSync(oxlintFilePath, `${oxlintFilePath}.bak`);
    }

    writeFileSync(oxlintFilePath, JSON.stringify(oxlintConfig, null, 2));

    const enabledRulesCount = countEnabledRules(oxlintConfig);

    const outputMessage = formatMigrationOutput({
      outputFileName: cliOptions.outputFile,
      enabledRulesCount,
      skippedRulesByCategory: reporter.getSkippedRulesByCategory(),
      cliOptions: {
        withNursery: !!cliOptions.withNursery,
        typeAware,
        details: !!cliOptions.details,
        jsPlugins,
      },
      eslintConfigPath: filePath,
    });

    displayMigrationResult(outputMessage, reporter.getWarnings());
  });

program.parse();

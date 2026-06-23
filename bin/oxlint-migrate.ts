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
 * Strips JSON comments (single-line `//` and multi-line) and trailing commas
 * so that `tsconfig.json` (which is actually JSONC) can be parsed with `JSON.parse`.
 */
const stripJsoncFeatures = (text: string): string =>
  text
    // Remove single-line comments
    .replace(/\/\/.*$/gm, '')
    // Remove multi-line comments
    .replace(/\/\*[\s\S]*?\*\//g, '')
    // Remove trailing commas before } or ]
    .replace(/,\s*([}\]])/g, '$1');

/**
 * When `--type-aware` is used, check whether the project's `tsconfig.json`
 * contains a `baseUrl` value in `compilerOptions`. If it does, emit a warning
 * because `tsgo` does not support `baseUrl`, which may cause issues with
 * type-aware linting.
 */
const warnIfTsconfigHasBaseUrl = (reporter: DefaultReporter): void => {
  const tsconfigPath = path.join(cwd, 'tsconfig.json');
  const content = getFileContent(tsconfigPath);

  if (content === undefined) {
    return;
  }

  try {
    const tsconfig = JSON.parse(stripJsoncFeatures(content));

    if (tsconfig?.compilerOptions?.baseUrl !== undefined) {
      reporter.addWarning(
        `tsconfig.json has \`baseUrl\` set to ${JSON.stringify(tsconfig.compilerOptions.baseUrl)}. ` +
          `\`baseUrl\` is not supported by tsgo, which may cause issues with type-aware linting. ` +
          `Consider removing \`baseUrl\` or using path aliases instead.`
      );
    }
  } catch {
    // If tsconfig.json can't be parsed, silently ignore — it's not critical.
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
    '--type-aware',
    'Includes supported type-aware rules. Needs the same flag in `oxlint` or the `typeAware` config option to enable it.'
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
    const jsPlugins = parseCliBoolean(cliOptions.jsPlugins);
    const oxlintFilePath = path.join(cwd, cliOptions.outputFile);
    const reporter = new DefaultReporter();

    const options: Options = {
      reporter,
      merge: !!cliOptions.merge,
      withNursery: !!cliOptions.withNursery,
      // TODO: Once the `typeAware` config option is added in oxlintrc.json, we can make
      // this default to true like `--js-plugins`.
      typeAware: !!cliOptions.typeAware,
      jsPlugins,
    };

    // Warn if --type-aware is used and tsconfig.json has baseUrl set,
    // since tsgo does not support baseUrl.
    if (options.typeAware) {
      warnIfTsconfigHasBaseUrl(reporter);
    }

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
        typeAware: !!cliOptions.typeAware,
        details: !!cliOptions.details,
        jsPlugins,
      },
      eslintConfigPath: filePath,
    });

    displayMigrationResult(outputMessage, reporter.getWarnings());
  });

program.parse();

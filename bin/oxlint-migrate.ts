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
import { Options, RuleSkipCategory } from '../src/types.js';
import { walkAndReplaceProjectFiles } from '../src/walker/index.js';
import { getAllProjectFiles } from './project-loader.js';
import { writeFile } from 'node:fs/promises';
import { preFixForJsPlugins } from '../src/js_plugin_fixes.js';
import { DefaultReporter } from '../src/reporter.js';

const cwd = process.cwd();

const getFileContent = (absoluteFilePath: string): string | undefined => {
  try {
    return readFileSync(absoluteFilePath, 'utf-8');
  } catch {
    return undefined;
  }
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
    'Includes supported type-aware rules. Needs the same flag in `oxlint` to enable it.'
  )
  .option(
    '--js-plugins',
    'Tries to convert unsupported oxlint plugins with `jsPlugins`.'
  )
  .action(async (filePath: string | undefined) => {
    const cliOptions = program.opts();
    const oxlintFilePath = path.join(cwd, cliOptions.outputFile);
    const reporter = new DefaultReporter();

    const options: Options = {
      reporter,
      merge: !!cliOptions.merge,
      withNursery: !!cliOptions.withNursery,
      typeAware: !!cliOptions.typeAware,
      jsPlugins: !!cliOptions.jsPlugins,
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

    const enabledRulesCount = Object.keys(oxlintConfig.rules || {}).length;
    reporter.setEnabledRulesCount(enabledRulesCount);

    const skippedRules = reporter.getSkippedRules();

    // Build output message
    let output = '';

    if (enabledRulesCount > 0) {
      output += `\n✨ ${cliOptions.outputFile} created with ${enabledRulesCount} rules.\n`;
    }

    if (skippedRules.length > 0) {
      // Aggregate by category
      const byCategory: Partial<Record<RuleSkipCategory, string[]>> = {};
      for (const rule of skippedRules) {
        if (!byCategory[rule.category]) {
          byCategory[rule.category] = [];
        }
        byCategory[rule.category].push(rule.ruleName);
      }

      const nurseryCount = byCategory['nursery']?.length || 0;
      const typeAwareCount = byCategory['type-aware']?.length || 0;
      const unsupportedCount = byCategory['unsupported']?.length || 0;

      output += `\n⚠️  ${skippedRules.length} rules skipped:\n`;

      if (nurseryCount > 0) {
        const examples = byCategory['nursery'].slice(0, 3).join(', ');
        const suffix = nurseryCount > 3 ? ', etc.' : '';
        output += `   - ${nurseryCount} Nursery    (Experimental: ${examples}${suffix})\n`;
      }

      if (typeAwareCount > 0) {
        const examples = byCategory['type-aware'].slice(0, 3).join(', ');
        const suffix = typeAwareCount > 3 ? ', etc.' : '';
        output += `   - ${typeAwareCount} Type-aware (Requires TS info: ${examples}${suffix})\n`;
      }

      if (unsupportedCount > 0) {
        const examples = byCategory['unsupported'].slice(0, 3).join(', ');
        const suffix = unsupportedCount > 3 ? ', etc.' : '';
        output += `   - ${unsupportedCount} Unsupported (${examples}${suffix})\n`;
      }

      // Suggest missing flags
      const missingFlags = [];
      if (nurseryCount > 0 && !cliOptions.withNursery) {
        missingFlags.push('--with-nursery');
      }
      if (typeAwareCount > 0 && !cliOptions.typeAware) {
        missingFlags.push('--type-aware');
      }

      if (missingFlags.length > 0) {
        const eslintConfigArg = filePath ? ` ${path.basename(filePath)}` : '';
        output += `\n👉 Re-run with flags to include more:\n`;
        output += `npx @oxlint/migrate${eslintConfigArg} ${missingFlags.join(' ')}\n`;
      }
    }

    if (enabledRulesCount > 0) {
      output += `\n🚀 Next:\n`;
      output += `npx oxlint .\n`;
    }

    console.log(output);

    // Output any other warnings that were accumulated via report()
    // (e.g., parse failures, unsupported configurations)
    const legacyReports = reporter.getReports();
    for (const report of legacyReports) {
      console.warn(report);
    }
  });

program.parse();

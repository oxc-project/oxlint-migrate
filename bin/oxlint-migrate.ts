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
import { Options } from '../src/types.js';
import { walkAndReplaceProjectFiles } from '../src/walker/index.js';
import { getAllProjectFiles } from './project-loader.js';

const cwd = process.cwd();

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
  .action(async (filePath: string | undefined) => {
    const cliOptions = program.opts();
    const oxlintFilePath = path.join(cwd, cliOptions.outputFile);

    if (filePath === undefined) {
      filePath = getAutodetectedEslintConfigName(cwd);
    } else {
      filePath = path.join(cwd, filePath);
    }

    if (filePath === undefined) {
      program.error(`could not autodetect eslint config file`);
    }

    const eslintConfigs = await loadESLintConfig(filePath);

    const options: Options = {
      reporter: console.warn,
      merge: !!cliOptions.merge,
      withNursery: !!cliOptions.withNursery,
    };

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

    if (cliOptions.replaceEslintComments) {
      await walkAndReplaceProjectFiles(await getAllProjectFiles(), options);
    }
  });

program.parse();

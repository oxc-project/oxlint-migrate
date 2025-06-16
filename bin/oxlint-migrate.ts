#!/usr/bin/env node

import { program } from 'commander';
import { getAutodetectedEslintConfigName } from './autoDetectConfigFile.js';
import { existsSync, renameSync, writeFileSync, readFileSync } from 'fs';
import main from '../src/index.js';
import path from 'path';
import packageJson from '../package.json' with { type: 'json' };
import { pathToFileURL } from 'node:url';
import { Options } from '../src/types.js';

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

    // report when json file is found
    if (filePath.endsWith('json')) {
      program.error(
        `json format is not supported. @oxlint/migrate only supports the eslint flat configuration`
      );
    }

    // report when file does not exists
    if (!existsSync(filePath)) {
      program.error(`eslint config file not found: ${filePath}`);
    }

    // windows allows only file:// prefix to be imported, reported Error:
    // Only URLs with a scheme in: file, data, and node are supported by the default ESM loader. On Windows, absolute paths must be valid file:// URLs. Received protocol 'c:'
    const eslintConfigs = await import(pathToFileURL(filePath).toString());

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
  });

program.parse();

#!/usr/bin/env node

import { program } from 'commander';
import { getAutodetectedEslintConfigName } from './autoDetectConfigFile.js';
import { existsSync, renameSync, writeFileSync } from 'fs';
import main from '../src/index.js';
import path from 'path';
import packageJson from '../package.json' assert { type: 'json' };
import { pathToFileURL } from 'node:url';

program
  .name('oxlint-migrate')
  .version(packageJson.version)
  .argument('[eslint-config]', 'The path to the eslint v9 config file')
  .action(async (filePath) => {
    let cwd = process.cwd();

    if (filePath === undefined) {
      filePath = getAutodetectedEslintConfigName(cwd);

      if (filePath === undefined) {
        program.error(`could not autodetect eslint config file`);
      }
    } else {
      filePath = path.join(cwd, filePath);
    }

    if (!existsSync(filePath)) {
      // check for failed auto detection
      program.error(`eslint config file not found: ${filePath}`);
    } else {
      // windows allows only file:// prefix to be imported, reported Error:
      // Only URLs with a scheme in: file, data, and node are supported by the default ESM loader. On Windows, absolute paths must be valid file:// URLs. Received protocol 'c:'
      const eslintConfigs = await import(pathToFileURL(filePath).toString());

      const oxlintConfig =
        'default' in eslintConfigs
          ? await main(eslintConfigs.default, console.warn)
          : await main(eslintConfigs, console.warn);

      const oxlintFilePath = path.join(cwd, '.oxlintrc.json');

      if (existsSync(oxlintFilePath)) {
        renameSync(oxlintFilePath, `${oxlintFilePath}.bak`);
      }

      writeFileSync(oxlintFilePath, JSON.stringify(oxlintConfig, null, 2));
    }
  });

program.parse();

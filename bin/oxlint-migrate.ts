#!/usr/bin/env node

import { program } from 'commander';
import { getAutodetectedEslintConfigName } from './autoDetectConfigFile.js';
import { existsSync } from 'fs';
import main from '../src/index.js';
import path from 'path';

program
  .name('oxlint-migrate')
  .version('0.0.0')
  // ToDo lazy auto detect it
  .argument('<eslint-config>', 'The path to the eslint v9 config file');

program.parse();

let [filePath] = program.args;

if (filePath === '') {
  filePath = getAutodetectedEslintConfigName() ?? '';
} else {
  filePath = path.join(process.cwd(), filePath);
}

if (!existsSync(filePath)) {
  // check for failed auto detection
  program.error(`eslint config file not found: ${filePath}`);
} else {
  console.log(filePath);
  const eslintConfigs = await import(filePath);
  const oxlintConfig = await main(eslintConfigs, console.warn);

  console.log(oxlintConfig);
}

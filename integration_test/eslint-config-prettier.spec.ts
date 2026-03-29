// @ts-expect-error
import eslintConfigPrettier from './projects/eslint-config-prettier.eslint.config.mjs';
import { testProject } from './utils.js';

testProject('eslint-config-prettier', eslintConfigPrettier);

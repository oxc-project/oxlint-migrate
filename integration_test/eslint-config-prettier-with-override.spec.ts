// @ts-expect-error
import eslintConfigPrettierWithOverride from './projects/eslint-config-prettier-with-override.eslint.config.mjs';
import { testProject } from './utils.js';

testProject(
  'eslint-config-prettier-with-override',
  eslintConfigPrettierWithOverride
);

import unicorn from 'eslint-plugin-unicorn';
import eslint from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';
import oxlint from 'eslint-plugin-oxlint';

export default [
  {
    ignores: ['dist/'],
  },
  eslint.configs.recommended,
  unicorn.configs['flat/recommended'],
  ...tseslint.configs.recommended,
  eslintConfigPrettier,
  ...oxlint.buildFromOxlintConfig({}),
];
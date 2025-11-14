import { globalIgnores } from 'eslint/config';
import react from 'eslint-plugin-react';
import tseslint from 'typescript-eslint';

export default tseslint.config([
  globalIgnores(['node_modules/**/*']),
  react.configs.flat.recommended,
  react.configs.flat['jsx-runtime'],
  {
    languageOptions: {
      parser: tseslint.parser,
      sourceType: 'module',
    },

    settings: {
      react: {
        version: 'detect',
      },
    },

    rules: {
      'react/jsx-filename-extension': 'off',
    },
  },
  {
    files: ['**/*.ts', '**/*.tsx'],

    extends: [
      react.configs.flat.recommended,
      react.configs.flat['jsx-runtime'],
    ],

    rules: {
      'react/prop-types': 'off',
    },
  },
]);

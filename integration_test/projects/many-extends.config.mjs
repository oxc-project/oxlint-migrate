// @ts-check

import js from '@eslint/js';
import importPlugin from 'eslint-plugin-import';
import jsdoc from 'eslint-plugin-jsdoc';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/** @type {import('typescript-eslint').ConfigArray} */
export const baseConfig = [
  js.configs.recommended,
  importPlugin.flatConfigs.recommended,
  jsdoc.configs['flat/recommended'],
  {
    linterOptions: {
      reportUnusedDisableDirectives: 'error',
      reportUnusedInlineConfigs: 'error',
    },
    rules: {
      'no-unused-vars': 'off',
    },
  },
];

export default tseslint.config([
  baseConfig,
  react.configs.flat.recommended,
  react.configs.flat['jsx-runtime'],
  reactHooks.configs.flat.recommended,
  importPlugin.flatConfigs.react,
  {
    rules: {
      'react/button-has-type': 'error',
    },
  },
  {
    files: ['foo.js'],

    languageOptions: {
      globals: {
        ...globals.commonjs,
        ...globals.node,
      },
    },

    rules: {
      'import/no-commonjs': 'off',
    },
  },
  {
    files: ['**/*.ts', '**/*.tsx'],

    extends: [
      tseslint.configs.strictTypeChecked,
      tseslint.configs.stylisticTypeChecked,
      react.configs.flat.recommended,
      react.configs.flat['jsx-runtime'],
      reactHooks.configs.flat.recommended,
      importPlugin.flatConfigs.react,
      importPlugin.flatConfigs.typescript,
      jsdoc.configs['flat/recommended-typescript'],
    ],

    languageOptions: {
      parserOptions: {
        projectService: true,
      },
    },

    rules: {
      'import/consistent-type-specifier-style': ['error', 'prefer-top-level'],
      'import/no-default-export': 'warn',

      'jsdoc/require-jsdoc': 'off',
      'jsdoc/require-param': 'off',
      'jsdoc/require-returns': 'off',

      'react/prefer-stateless-function': 'warn',
      'react/function-component-definition': [
        'error',
        {
          namedComponents: 'arrow-function',
        },
      ],
    },
  },
]);

import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    rules: {
      'no-invalid-regexp': 'error',
    },
  },
  {
    files: ['**/*.ts', '**/*.tsx'],

    extends: [
      tseslint.configs.strictTypeChecked,
      tseslint.configs.stylisticTypeChecked,
    ],

    rules: {
      '@typescript-eslint/no-deprecated': 'error',
    },
  }
);

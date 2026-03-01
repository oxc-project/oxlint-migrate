import e18e from '@e18e/eslint-plugin';

// Demonstrates a cross-config plugin scenario: plugin is declared in one
// config object, rules using those plugins are declared in a separate object.
// This is valid ESLint flat config, so oxlint-migrate needs to handle it.
export default [
  // Config 1: only plugin registration, no rules
  {
    plugins: { e18e },
  },
  // Config 2: only rules, no plugins
  {
    rules: {
      'e18e/prefer-array-at': 'error',
      'e18e/prefer-includes': 'warn',
    },
  },
];

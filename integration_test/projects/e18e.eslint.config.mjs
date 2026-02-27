import e18e from '@e18e/eslint-plugin';

export default [
  e18e.configs.recommended,
  {
    rules: {
      'e18e/prefer-array-at': 'off',
    },
  },
];

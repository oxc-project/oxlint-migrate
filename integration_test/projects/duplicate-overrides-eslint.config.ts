import antfu from '@antfu/eslint-config';

export default await antfu(
  {
    unocss: false,
    vue: {
      overrides: {
        'vue/no-restricted-syntax': ['error'],
      },
    },
  },
  {
    rules: {
      'node/prefer-global/process': 'off',
    },
  },
  // Sort local files
  {
    files: ['locales/**.json'],
    rules: {
      'jsonc/sort-keys': 'error',
    },
  }
);

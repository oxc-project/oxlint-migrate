import jsxA11y from 'eslint-plugin-jsx-a11y';

// This SHOULD result in `jsx-a11y/no-autofocus` being set to `error` WITH `ignoreNonDOM` set to `true`, but instead it is unset.
//
// It is set to `error` WITH `ignoreNonDOM` set to `true` in the first config.
// It is set to `error` without a config option set explicitly in the second config.

export default [
  {
    plugins: {
      'jsx-a11y': jsxA11y,
    },
    rules: {
      'jsx-a11y/no-autofocus': ['error', { ignoreNonDOM: true }],
    },
  },
  {
    plugins: {
      'jsx-a11y': jsxA11y,
    },
    rules: {
      'jsx-a11y/no-autofocus': ['error'],
    },
  },
  {
    files: ['**/files/**'],
    plugins: {
      'jsx-a11y': jsxA11y,
    },
    rules: {
      'jsx-a11y/no-autofocus': ['warn'],
    },
  },
  {
    name: 'general-config',
    rules: {
      curly: 'off',
    },
  },
];

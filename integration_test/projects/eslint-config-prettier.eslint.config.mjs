import babelPlugin from '@babel/eslint-plugin';
import eslintConfigPrettier from 'eslint-config-prettier/flat';

export default [
  {
    plugins: {
      '@babel': babelPlugin,
    },
    rules: {
      // This rule is enabled here, but eslint-config-prettier turns it
      // off because it conflicts with Prettier formatting.
      '@babel/object-curly-spacing': 'error',
    },
  },
  // eslint-config-prettier disables all formatting rules, including the
  // @babel rule above. After this config is applied, all @babel rules
  // are "off".
  eslintConfigPrettier,
];

import babelPlugin from '@babel/eslint-plugin';
import eslintConfigPrettier from 'eslint-config-prettier/flat';

export default [
  {
    plugins: {
      '@babel': babelPlugin,
    },
    rules: {
      // Enabled in base config, but eslint-config-prettier turns it off.
      '@babel/object-curly-spacing': 'error',
    },
  },
  {
    // In this override, the base @babel rules are re-enabled for test files,
    // and one is explicitly turned off. The jsPlugin should be kept in the
    // override so that oxlint can resolve the @babel rule names.
    files: ['**/*.test.js'],
    plugins: {
      '@babel': babelPlugin,
    },
    rules: {
      // This rule is NOT affected by eslint-config-prettier, so the
      // override should keep it (and the jsPlugin) while
      // the base config has no jsPlugins or babel rules.
      '@babel/no-invalid-this': 'error',
    },
  },
  // eslint-config-prettier disables all @babel formatting rules in the base.
  eslintConfigPrettier,
];

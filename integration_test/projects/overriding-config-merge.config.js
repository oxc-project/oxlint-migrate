import { defineConfig } from 'eslint/config';
import regexpPlugin from 'eslint-plugin-regexp';

const configs = {
  strict: {
    name: 'config/strict',
    plugins: { regexp: regexpPlugin },
    rules: {
      'regexp/no-lazy-ends': ['error', { ignorePartial: false }],
    },
  },
};

export default defineConfig([
  configs.strict,
  {
    plugins: { regexp: regexpPlugin },
    rules: {
      // This should end up overriding the no-lazy-ends from the configs.strict config.
      // So it should end up as "off" in the final oxlint config.
      'regexp/no-lazy-ends': 'off',
    },
  },
]);

import { defineConfig } from 'eslint/config';
import regexpPlugin from 'eslint-plugin-regexp';

export default defineConfig([
  {
    plugins: { regexp: regexpPlugin },
    rules: {
      'regexp/no-lazy-ends': ['error', { ignorePartial: false }],
    },
  },
  {
    plugins: { regexp: regexpPlugin },
    files: ['**/*.js'],
    rules: {
      // This should only result in a change for .js files, not *all* files.
      'regexp/no-lazy-ends': ['off'],
    },
  },
]);

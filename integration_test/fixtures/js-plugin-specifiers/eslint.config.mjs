import mocha from 'eslint-plugin-mocha';
import regexp from 'eslint-plugin-regexp';
import stylistic from '@stylistic/eslint-plugin';
import anonymous from './plugins/anonymous.js';
import named from './plugins/named.js';

/** Built in the config file itself, so no module can be pointed at. */
const inline = {
  rules: { 'no-inline': { create: () => ({}) } },
};

export default [
  {
    plugins: { mylocal: named, anon: anonymous, inline },
    rules: {
      'mylocal/no-named': 'error',
      'anon/no-anonymous': 'warn',
      'inline/no-inline': 'error',
    },
  },
  {
    // `mocha` is registered under an alias, `regexp` under its own name.
    plugins: { regexp, moka: mocha, '@stylistic': stylistic },
    rules: {
      'regexp/no-lazy-ends': 'error',
      'moka/no-exclusive-tests': 'error',
      '@stylistic/indent': ['error', 2],
    },
  },
];

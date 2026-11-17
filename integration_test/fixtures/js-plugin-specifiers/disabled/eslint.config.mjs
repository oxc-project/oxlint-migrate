import regexp from 'eslint-plugin-regexp';

export default [
  {
    plugins: { regexp },
    rules: { 'regexp/no-lazy-ends': 'error' },
  },
];

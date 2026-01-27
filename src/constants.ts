export const rulesPrefixesForPlugins: Record<string, string> = {
  import: 'import',
  'import-x': 'import',
  jest: 'jest',
  jsdoc: 'jsdoc',
  'jsx-a11y': 'jsx-a11y',
  '@next/next': 'nextjs',
  node: 'node',
  n: 'node',
  promise: 'promise',
  react: 'react',
  'react-perf': 'react-perf',
  'react-hooks': 'react',
  'react-refresh': 'react',
  '@typescript-eslint': 'typescript',
  unicorn: 'unicorn',
  vitest: 'vitest',
  vue: 'vue',
};

// Some typescript-eslint rules are re-implemented version of eslint rules.
// Since oxlint supports these rules under eslint/* and it also supports TS,
// we should override these to make implementation status up-to-date.
// remapping in source-code: <https://github.com/oxc-project/oxc/blob/94320ab6f60ef6aaedeb901b04ccb57e953f66bf/crates/oxc_linter/src/utils/mod.rs#L77>
export const typescriptRulesExtendEslintRules = [
  'class-methods-use-this',
  'default-param-last',
  'init-declarations',
  'max-params',
  'no-array-constructor',
  'no-dupe-class-members',
  'no-empty-function',
  'no-invalid-this',
  'no-loop-func',
  'no-loss-of-precision',
  'no-magic-numbers',
  'no-redeclare',
  'no-restricted-imports',
  'no-shadow',
  'no-unused-expressions',
  'no-unused-vars',
  'no-use-before-define',
  'no-useless-constructor',
];

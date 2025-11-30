// these are the mappings from the scope in the rules.rs to the eslint scope
// only used for the scopes where the directory structure doesn't reflect the eslint scope
// such as `typescript` vs `@typescript-eslint` or others. Eslint as a scope is an exception,
// as eslint doesn't have a scope.
// look here: <https://github.com/oxc-project/oxc/blob/0b329516372a0353e9eb18e5bc0fbe63bce21fee/crates/oxc_linter/src/config/rules.rs#L285>
export const aliasPluginNames: Record<string, string> = {
  // for scripts/generate and src/build-from-oxlint-config
  eslint: '',
  typescript: '@typescript-eslint',
  nextjs: '@next/next',

  // only for src/build-from-oxlint-config
  react_perf: 'react-perf',
  jsx_a11y: 'jsx-a11y',
};

// Some vitest rules are re-implemented version of jest rules.
// Since oxlint supports these rules under jest/*, we need to remap them.
// remapping in source-code: <https://github.com/oxc-project/oxc/blob/94320ab6f60ef6aaedeb901b04ccb57e953f66bf/crates/oxc_linter/src/utils/mod.rs>
export const viteTestCompatibleRules = [
  'consistent-test-it',
  'expect-expect',
  'max-expects',
  'max-nested-describe',
  'no-alias-methods',
  'no-commented-out-tests',
  'no-conditional-expect',
  'no-conditional-in-test',
  'no-disabled-tests',
  'no-duplicate-hooks',
  'no-focused-tests',
  'no-hooks',
  'no-identical-title',
  'no-interpolation-in-snapshots',
  'no-restricted-jest-methods',
  'no-restricted-matchers',
  'no-standalone-expect',
  'no-test-prefixes',
  'no-test-return-statement',
  'prefer-comparison-matcher',
  'prefer-each',
  'prefer-equality-matcher',
  'prefer-expect-resolves',
  'prefer-hooks-in-order',
  'prefer-hooks-on-top',
  'prefer-lowercase-title',
  'prefer-mock-promise-shorthand',
  'prefer-strict-equal',
  'prefer-to-be',
  'prefer-to-have-length',
  'prefer-todo',
  'require-to-throw-message',
  'require-top-level-describe',
  'valid-describe-callback',
  'valid-expect',
];

export const unicornRulesExtendEslintRules = ['no-negated-condition'];

// All rules from `eslint-plugin-react-hooks`
// Since oxlint supports these rules under react/*, we need to remap them.
export const reactHookRulesInsideReactScope = [
  'rules-of-hooks',
  'exhaustive-deps',
];

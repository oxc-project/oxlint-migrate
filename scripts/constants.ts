// these are the mappings from the scope in the rules.rs to the eslint scope
// only used for the scopes where the directory structure doesn't reflect the eslint scope
// such as `typescript` vs `@typescript-eslint` or others. Eslint as a scope is an exception,
// as eslint doesn't have a scope.
// Basically the reverse of this: <https://github.com/oxc-project/oxc/blob/94320ab6f60ef6aaedeb901b04ccb57e953f66bf/crates/oxc_linter/src/config/rules.rs#L246>
export const aliasPluginNames: Record<string, string> = {
  // for scripts/generate and src/build-from-oxlint-config
  eslint: '',
  typescript: '@typescript-eslint',
  nextjs: '@next/next',

  // only for src/build-from-oxlint-config
  react_perf: 'react-perf',
  jsx_a11y: 'jsx-a11y',
};

export const unicornRulesExtendEslintRules = ['no-negated-condition'];

// All rules from `eslint-plugin-react-hooks`
// Since oxlint supports these rules under react/*, we need to remap them.
// See https://react.dev/reference/eslint-plugin-react-hooks#recommended for the full list
// (React Compiler-related rules are sourced in an odd way, so there's no good source code location to find them all)
export const reactHookRulesInsideReactScope = [
  'rules-of-hooks',
  'exhaustive-deps',

  // Compiler-related rules
  'component-hook-factories',
  'config',
  'error-boundaries',
  'gating',
  'globals',
  'immutability',
  'incompatible-library',
  'preserve-manual-memoization',
  'purity',
  'refs',
  'set-state-in-effect',
  'set-state-in-render',
  'static-components',
  'unsupported-syntax',
  'use-memo',
];

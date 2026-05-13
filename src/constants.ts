import type { OxlintConfigPlugin } from './types.js';

export const rulesPrefixesForPlugins: Record<string, OxlintConfigPlugin> = {
  import: 'import',
  'import-x': 'import',
  jest: 'jest',
  jsdoc: 'jsdoc',
  'jsx-a11y': 'jsx-a11y',
  'jsx-a11y-x': 'jsx-a11y',
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

/**
 * Normalizes an ESLint-style rule name to its canonical Oxlint form.
 * e.g. "@typescript-eslint/no-floating-promises" → "typescript/no-floating-promises"
 *      "react-hooks/exhaustive-deps" → "react/exhaustive-deps"
 *      "@next/next/inline-script-id" → "nextjs/inline-script-id"
 *      "no-unused-vars" → "no-unused-vars" (unchanged for unprefixed rules)
 */
export function normalizeRuleToCanonical(rule: string): string {
  for (const [prefix, plugin] of Object.entries(rulesPrefixesForPlugins)) {
    if (prefix !== plugin && rule.startsWith(`${prefix}/`)) {
      return `${plugin}/${rule.slice(prefix.length + 1)}`;
    }
  }
  return rule;
}

// Some ESLint rules are superseded by @typescript-eslint equivalents in oxlint.
// When --type-aware is enabled, we should remap these ESLint rules to their
// @typescript-eslint counterparts so they get migrated correctly.
export const eslintRulesToTypescriptEquivalents: Record<string, string> = {
  'dot-notation': '@typescript-eslint/dot-notation',
  'consistent-return': '@typescript-eslint/consistent-return',
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

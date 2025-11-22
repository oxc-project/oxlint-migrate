import { defineConfig } from 'eslint/config';

export default defineConfig([
  {
    files: ['**/*.js', '**/*.cjs', '**/*.mjs'],
    rules: {
      'no-unused-vars': 'error',
    },
  },
  // These intentionally have identical rulesets to test merging when converting, this can happen in some complex
  // configs, but it's easier to understand with an arbitrary example like this.
  // As long as the plugins and rules and globals are all the same, these can
  // be safely merged by merging the file globs.
  {
    files: ['**/*.ts'],
    rules: {
      'arrow-body-style': 'error',
    },
  },
  {
    files: ['**/*.mts', '**/*.cts'],
    rules: {
      'arrow-body-style': 'error',
    },
  },
]);

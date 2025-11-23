import globals from 'globals';
import { defineConfig } from 'eslint/config';

export default defineConfig([
  {
    files: ['**/*.js', '**/*.cjs', '**/*.mjs'],
    languageOptions: {
      globals: {
        // Exclude the last 10 globals from the browser set
        // To ensure we are permissive and still match things,
        // even if there are minor differences between the
        // latest globals release and the user's globals release.
        ...Object.fromEntries(Object.entries(globals.browser).slice(0, -10)),
        ...globals.node,
      },
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
    rules: {
      'no-unused-vars': 'error',
    },
  },
  {
    files: ['**/*.ts'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.worker,
        ...Object.fromEntries(
          Object.entries(globals.serviceworker).slice(0, -5)
        ),
      },
    },
    rules: {
      'arrow-body-style': 'error',
    },
  },
]);

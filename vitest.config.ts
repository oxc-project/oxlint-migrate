import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    server: {
      deps: {
        // The fixtures under `integration_test/fixtures` stand in for a user's
        // project: they must be imported by Node itself, not inlined by Vite, so
        // that `bin/config-loader.ts` can trace them through Node's module hooks.
        external: [/integration_test[\\/]fixtures[\\/]/],
      },
    },
    coverage: {
      include: ['src', 'scripts'],
    },
    typecheck: {
      enabled: true,
      tsconfig: './tsconfig.json',
    },
  },
});

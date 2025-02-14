import path from 'node:path';
import dts from 'vite-plugin-dts';
import { defineConfig, Plugin } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      include: ['src', 'scripts'],
    },
  },
  build: {
    target: 'node18',
    lib: {
      entry: [
        path.resolve(import.meta.dirname, 'src/index.ts'),
        path.resolve(import.meta.dirname, 'bin/oxlint-migrate.ts'),
      ],
      fileName: (_format, entryName) => {
        return `${entryName}.mjs`;
      },
      name: 'oxlint-migrate',
      formats: ['es'],
    },
    rollupOptions: {
      external: (id: string) => !id.startsWith('.') && !path.isAbsolute(id),
      output: {
        preserveModules: true,
      },
    },
    minify: false,
  },
  plugins: [
    dts({
      include: 'src/**',
      exclude: 'src/**/*.spec.ts',
    }) as Plugin,
  ],
});

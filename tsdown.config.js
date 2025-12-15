import { defineConfig } from 'tsdown';

export default defineConfig({
  dts: true,
  target: 'node18',
  entry: ['src/index.ts', 'bin/oxlint-migrate.ts'],
  fixedExtension: true,
});

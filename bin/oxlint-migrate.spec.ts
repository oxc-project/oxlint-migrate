import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const runMigrate = (args: string[]) => {
  execFileSync(
    process.execPath,
    ['--import', '@oxc-node/core/register', './bin/oxlint-migrate.ts', ...args],
    {
      cwd: process.cwd(),
      stdio: 'pipe',
    }
  );
};

describe('oxlint-migrate CLI defaults', () => {
  it('enables --type-aware and --js-plugins by default', () => {
    const cwd = process.cwd();
    const tempDir = mkdtempSync(path.join(cwd, '.tmp-oxlint-migrate-cli-'));
    const configPath = path.join(tempDir, 'eslint.config.mjs');
    const outputPath = path.join(tempDir, 'out.json');

    try {
      writeFileSync(
        configPath,
        `export default {
  rules: {
    '@typescript-eslint/no-floating-promises': 'error',
    'regexp/no-lazy-ends': ['error', { ignorePartial: false }],
  },
};
`,
        'utf8'
      );

      runMigrate([
        path.relative(cwd, configPath),
        '--output-file',
        path.relative(cwd, outputPath),
      ]);

      const output = JSON.parse(readFileSync(outputPath, 'utf8'));
      expect(output.rules['@typescript-eslint/no-floating-promises']).toBe(
        'error'
      );
      expect(output.rules['regexp/no-lazy-ends']).toStrictEqual([
        'error',
        { ignorePartial: false },
      ]);
      expect(output.jsPlugins).toContain('eslint-plugin-regexp');
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('can disable default behavior with --type-aware=false and --js-plugins=false', () => {
    const cwd = process.cwd();
    const tempDir = mkdtempSync(path.join(cwd, '.tmp-oxlint-migrate-cli-'));
    const configPath = path.join(tempDir, 'eslint.config.mjs');
    const outputPath = path.join(tempDir, 'out.json');

    try {
      writeFileSync(
        configPath,
        `export default {
  rules: {
    '@typescript-eslint/no-floating-promises': 'error',
    'regexp/no-lazy-ends': ['error', { ignorePartial: false }],
  },
};
`,
        'utf8'
      );

      runMigrate([
        path.relative(cwd, configPath),
        '--output-file',
        path.relative(cwd, outputPath),
        '--type-aware=false',
        '--js-plugins=false',
      ]);

      const output = JSON.parse(readFileSync(outputPath, 'utf8'));
      expect(output.rules).toBeUndefined();
      expect(output.jsPlugins).toBeUndefined();
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});

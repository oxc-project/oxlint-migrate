import { execFileSync, spawnSync } from 'node:child_process';
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

const projectRoot = process.cwd();
const cliScript = path.join(projectRoot, 'bin', 'oxlint-migrate.ts');

const runMigrateWithStderr = (
  args: string[],
  options?: { cwd?: string }
): { stdout: string; stderr: string } => {
  const result = spawnSync(
    process.execPath,
    ['--import', '@oxc-node/core/register', cliScript, ...args],
    {
      cwd: options?.cwd ?? projectRoot,
      stdio: 'pipe',
    }
  );

  if (result.status !== 0) {
    throw new Error(
      `CLI exited with code ${result.status}: ${result.stderr?.toString()}`
    );
  }

  return {
    stdout: result.stdout?.toString() ?? '',
    stderr: result.stderr?.toString() ?? '',
  };
};

describe('oxlint-migrate CLI defaults', () => {
  it('enables --js-plugins by default but not --type-aware', () => {
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
      expect(
        output.rules['@typescript-eslint/no-floating-promises']
      ).toBeUndefined();
      expect(output.rules['regexp/no-lazy-ends']).toStrictEqual([
        'error',
        { ignorePartial: false },
      ]);
      expect(output.jsPlugins).toContain('eslint-plugin-regexp');
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('can disable default behavior with --js-plugins=false', () => {
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
        '--js-plugins=false',
      ]);

      const output = JSON.parse(readFileSync(outputPath, 'utf8'));
      expect(output.rules).toBeUndefined();
      expect(output.jsPlugins).toBeUndefined();
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('can enable type-aware rules with --type-aware', () => {
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
        '--type-aware',
      ]);

      const output = JSON.parse(readFileSync(outputPath, 'utf8'));
      expect(output.rules['typescript/no-floating-promises']).toStrictEqual(
        'error'
      );
      // JS Plugins should still be included by default
      expect(output.rules['regexp/no-lazy-ends']).toStrictEqual([
        'error',
        { ignorePartial: false },
      ]);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});

describe('--type-aware baseUrl warning', () => {
  const eslintConfigContent = `export default {
  rules: {
    '@typescript-eslint/no-floating-promises': 'error',
  },
};
`;

  it('prints a warning when --type-aware is used and tsconfig.json has baseUrl', () => {
    const tempDir = mkdtempSync(
      path.join(projectRoot, '.tmp-oxlint-migrate-cli-')
    );
    const tsconfigPath = path.join(tempDir, 'tsconfig.json');

    try {
      writeFileSync(
        path.join(tempDir, 'eslint.config.mjs'),
        eslintConfigContent,
        'utf8'
      );
      writeFileSync(
        tsconfigPath,
        JSON.stringify({
          compilerOptions: {
            baseUrl: '.',
            strict: true,
          },
        }),
        'utf8'
      );

      const { stderr } = runMigrateWithStderr(
        ['eslint.config.mjs', '--output-file', 'out.json', '--type-aware'],
        { cwd: tempDir }
      );

      expect(stderr).toContain('baseUrl');
      expect(stderr).toContain('tsgo');
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('does not print a warning when --type-aware is not used', () => {
    const tempDir = mkdtempSync(
      path.join(projectRoot, '.tmp-oxlint-migrate-cli-')
    );
    const tsconfigPath = path.join(tempDir, 'tsconfig.json');

    try {
      writeFileSync(
        path.join(tempDir, 'eslint.config.mjs'),
        eslintConfigContent,
        'utf8'
      );
      writeFileSync(
        tsconfigPath,
        JSON.stringify({
          compilerOptions: {
            baseUrl: '.',
            strict: true,
          },
        }),
        'utf8'
      );

      const { stderr } = runMigrateWithStderr(
        ['eslint.config.mjs', '--output-file', 'out.json'],
        { cwd: tempDir }
      );

      expect(stderr).not.toContain('baseUrl');
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('does not print a warning when tsconfig.json has no baseUrl', () => {
    const tempDir = mkdtempSync(
      path.join(projectRoot, '.tmp-oxlint-migrate-cli-')
    );
    const tsconfigPath = path.join(tempDir, 'tsconfig.json');

    try {
      writeFileSync(
        path.join(tempDir, 'eslint.config.mjs'),
        eslintConfigContent,
        'utf8'
      );
      writeFileSync(
        tsconfigPath,
        JSON.stringify({
          compilerOptions: {
            strict: true,
          },
        }),
        'utf8'
      );

      const { stderr } = runMigrateWithStderr(
        ['eslint.config.mjs', '--output-file', 'out.json', '--type-aware'],
        { cwd: tempDir }
      );

      expect(stderr).not.toContain('baseUrl');
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('does not print a warning when tsconfig.json does not exist', () => {
    const tempDir = mkdtempSync(
      path.join(projectRoot, '.tmp-oxlint-migrate-cli-')
    );
    try {
      writeFileSync(
        path.join(tempDir, 'eslint.config.mjs'),
        eslintConfigContent,
        'utf8'
      );

      const { stderr } = runMigrateWithStderr(
        ['eslint.config.mjs', '--output-file', 'out.json', '--type-aware'],
        { cwd: tempDir }
      );

      expect(stderr).not.toContain('baseUrl');
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});

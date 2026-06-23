import { execFileSync } from 'node:child_process';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import globals from 'globals';
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

  it('uses the project globals package to collapse globals to env', () => {
    const cwd = process.cwd();
    const tempDir = mkdtempSync(path.join(cwd, '.tmp-oxlint-migrate-cli-'));
    const configPath = path.join(tempDir, 'eslint.config.mjs');
    const outputPath = path.join(tempDir, 'out.json');
    const projectGlobalsPath = path.join(tempDir, 'node_modules/globals');
    const browserEntries = Object.entries(globals.browser);
    const browserGlobals = Object.fromEntries(
      browserEntries.slice(0, Math.floor(browserEntries.length * 0.95))
    );

    try {
      mkdirSync(projectGlobalsPath, { recursive: true });
      writeFileSync(
        path.join(projectGlobalsPath, 'package.json'),
        JSON.stringify({ name: 'globals', version: '0.0.0', main: 'index.js' }),
        'utf8'
      );
      writeFileSync(
        path.join(projectGlobalsPath, 'index.js'),
        `module.exports = ${JSON.stringify({ browser: browserGlobals })};\n`,
        'utf8'
      );
      writeFileSync(
        configPath,
        `import globals from 'globals';

export default {
  languageOptions: {
    globals: {
      ...globals.browser,
    },
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
      expect(output.env.browser).toBe(true);
      expect(output.globals).toBeUndefined();
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});

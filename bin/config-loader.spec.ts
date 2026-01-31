import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { loadESLintConfig } from './config-loader.js';
import { existsSync } from 'node:fs';

vi.mock('node:fs', () => ({
  existsSync: vi.fn(),
}));

describe('loadESLintConfig', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should throw error for JSON config files', async () => {
    vi.mocked(existsSync).mockReturnValue(true);

    await expect(
      loadESLintConfig('/path/to/eslint.config.json')
    ).rejects.toThrow(
      'json format is not supported. @oxlint/migrate only supports the eslint flat configuration'
    );
  });

  it('should throw error when file does not exist', async () => {
    vi.mocked(existsSync).mockReturnValue(false);

    await expect(loadESLintConfig('/path/to/eslint.config.js')).rejects.toThrow(
      'eslint config file not found: /path/to/eslint.config.js'
    );
  });

  it('should throw error for TypeScript config on Node < 22.18.0', async () => {
    vi.mocked(existsSync).mockReturnValue(true);

    // Mock process.versions.node to simulate older Node version
    const originalVersion = process.versions.node;
    Object.defineProperty(process.versions, 'node', {
      value: '20.0.0',
      configurable: true,
    });

    try {
      await expect(
        loadESLintConfig('/path/to/eslint.config.ts')
      ).rejects.toThrow(
        /TypeScript ESLint config files require Node.js >=22.18.0/
      );
    } finally {
      // Restore original version
      Object.defineProperty(process.versions, 'node', {
        value: originalVersion,
        configurable: true,
      });
    }
  });

  it('should throw error for .mts config on Node < 22.18.0', async () => {
    vi.mocked(existsSync).mockReturnValue(true);

    const originalVersion = process.versions.node;
    Object.defineProperty(process.versions, 'node', {
      value: '21.5.0',
      configurable: true,
    });

    try {
      await expect(
        loadESLintConfig('/path/to/eslint.config.mts')
      ).rejects.toThrow(
        /TypeScript ESLint config files require Node.js >=22.18.0/
      );
    } finally {
      Object.defineProperty(process.versions, 'node', {
        value: originalVersion,
        configurable: true,
      });
    }
  });

  it('should throw error for .cts config on Node < 22.18.0', async () => {
    vi.mocked(existsSync).mockReturnValue(true);

    const originalVersion = process.versions.node;
    Object.defineProperty(process.versions, 'node', {
      value: '22.17.0',
      configurable: true,
    });

    try {
      await expect(
        loadESLintConfig('/path/to/eslint.config.cts')
      ).rejects.toThrow(
        /TypeScript ESLint config files require Node.js >=22.18.0/
      );
    } finally {
      Object.defineProperty(process.versions, 'node', {
        value: originalVersion,
        configurable: true,
      });
    }
  });

  it('should include current version in error message', async () => {
    vi.mocked(existsSync).mockReturnValue(true);

    const originalVersion = process.versions.node;
    Object.defineProperty(process.versions, 'node', {
      value: '18.0.0',
      configurable: true,
    });

    try {
      await expect(
        loadESLintConfig('/path/to/eslint.config.ts')
      ).rejects.toThrow(/current version: 18.0.0/);
    } finally {
      Object.defineProperty(process.versions, 'node', {
        value: originalVersion,
        configurable: true,
      });
    }
  });

  it('should accept Node 22.18.0', async () => {
    vi.mocked(existsSync).mockReturnValue(true);

    const originalVersion = process.versions.node;
    Object.defineProperty(process.versions, 'node', {
      value: '22.18.0',
      configurable: true,
    });

    try {
      // We can't test actual import since it would require a real file
      // But we can verify no error is thrown before import attempt
      const promise = loadESLintConfig('/path/to/eslint.config.ts');

      // The import will fail (file doesn't exist or is mocked), but
      // we should not get the version check error
      await expect(promise).rejects.not.toThrow(
        /TypeScript ESLint config files require Node.js/
      );
    } finally {
      Object.defineProperty(process.versions, 'node', {
        value: originalVersion,
        configurable: true,
      });
    }
  });

  it('should accept Node 22.19.0', async () => {
    vi.mocked(existsSync).mockReturnValue(true);

    const originalVersion = process.versions.node;
    Object.defineProperty(process.versions, 'node', {
      value: '22.19.0',
      configurable: true,
    });

    try {
      const promise = loadESLintConfig('/path/to/eslint.config.ts');

      await expect(promise).rejects.not.toThrow(
        /TypeScript ESLint config files require Node.js/
      );
    } finally {
      Object.defineProperty(process.versions, 'node', {
        value: originalVersion,
        configurable: true,
      });
    }
  });

  it('should accept Node 23.0.0', async () => {
    vi.mocked(existsSync).mockReturnValue(true);

    const originalVersion = process.versions.node;
    Object.defineProperty(process.versions, 'node', {
      value: '23.0.0',
      configurable: true,
    });

    try {
      const promise = loadESLintConfig('/path/to/eslint.config.mts');

      await expect(promise).rejects.not.toThrow(
        /TypeScript ESLint config files require Node.js/
      );
    } finally {
      Object.defineProperty(process.versions, 'node', {
        value: originalVersion,
        configurable: true,
      });
    }
  });
});

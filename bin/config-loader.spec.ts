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
});

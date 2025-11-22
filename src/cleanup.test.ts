import { describe, it, expect } from 'vitest';
import { cleanUpOxlintConfig } from './cleanup.js';
import type { OxlintConfig } from './types.js';

describe('cleanUpOxlintConfig', () => {
  describe('overrides cleanup', () => {
    it('should remove empty overrides array', () => {
      const config: OxlintConfig = {
        overrides: [],
      };
      cleanUpOxlintConfig(config);
      expect(config.overrides).toBeUndefined();
    });

    it('should remove overrides with only one key (files)', () => {
      const config: OxlintConfig = {
        overrides: [{ files: ['*.ts'] }],
      };
      cleanUpOxlintConfig(config);
      expect(config.overrides).toBeUndefined();
    });

    it('should keep overrides with files and rules', () => {
      const config: OxlintConfig = {
        overrides: [
          {
            files: ['*.ts'],
            rules: { 'no-console': 'error' },
          },
        ],
      };
      cleanUpOxlintConfig(config);
      expect(config.overrides).toHaveLength(1);
    });

    it('should merge consecutive identical overrides', () => {
      const config: OxlintConfig = {
        overrides: [
          {
            files: ['*.ts', '*.tsx'],
            plugins: ['typescript'],
          },
          {
            files: ['*.ts', '*.tsx'],
            plugins: ['typescript'],
          },
        ],
      };
      cleanUpOxlintConfig(config);
      expect(config.overrides).toHaveLength(1);
    });

    it('should not merge non-consecutive identical overrides', () => {
      const config: OxlintConfig = {
        overrides: [
          {
            files: ['*.ts'],
            rules: { 'no-console': 'error' },
          },
          {
            files: ['*.js'],
            rules: { 'no-var': 'error' },
          },
          {
            files: ['*.ts'],
            rules: { 'no-console': 'error' },
          },
        ],
      };
      cleanUpOxlintConfig(config);
      expect(config.overrides).toHaveLength(3);
    });
  });

  describe('env cleanup', () => {
    it('should remove unsupported es3, es5, es2015 env keys', () => {
      const config: OxlintConfig = {
        env: {
          es3: true,
          es5: true,
          es2015: true,
          es2020: true,
        },
      };
      cleanUpOxlintConfig(config);
      expect(config.env?.es3).toBeUndefined();
      expect(config.env?.es5).toBeUndefined();
      expect(config.env?.es2015).toBeUndefined();
      expect(config.env?.es2020).toBe(true);
    });

    it('should remove older ES versions when newer one is present', () => {
      const config: OxlintConfig = {
        env: {
          es2020: true,
          es2021: true,
          es2022: true,
        },
      };
      cleanUpOxlintConfig(config);
      expect(config.env?.es2020).toBeUndefined();
      expect(config.env?.es2021).toBeUndefined();
      expect(config.env?.es2022).toBe(true);
    });
  });

  describe('globals cleanup', () => {
    it('should remove empty globals object', () => {
      const config: OxlintConfig = {
        globals: {},
      };
      cleanUpOxlintConfig(config);
      expect(config.globals).toBeUndefined();
    });

    it('should keep non-empty globals object', () => {
      const config: OxlintConfig = {
        globals: {
          myGlobal: 'readonly',
        },
      };
      cleanUpOxlintConfig(config);
      expect(config.globals).toBeDefined();
      expect(config.globals?.myGlobal).toBe('readonly');
    });
  });
});

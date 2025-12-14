import { describe, expect, test } from 'vitest';
import migrateConfig from '../../src/index.js';

import tseslint from 'typescript-eslint';

const eslintConfig = tseslint.config(
  {
    rules: {
      'no-invalid-regexp': 'error',
    },
  },
  {
    files: ['**/*.ts', '**/*.tsx'],

    extends: [tseslint.configs.strictTypeChecked],

    rules: {
      '@typescript-eslint/no-deprecated': 'error',
    },
  }
);

/**
 * The above config should end up with one override in oxlint, with the typescript plugin enabled.
 *
 * So the override should end up looking like this:
 * ```
 * {
 *   files: ['*.ts', '*.tsx'],
 *   rules: {
 *     '@typescript-eslint/no-deprecated': 'error',
 *   },
 *   plugins: ['typescript'],
 * }
 * ```
 */
describe('override-merging-with-plugins', () => {
  test('should merge the plugins into the prior override config correctly', async () => {
    const oxlintConfig = await migrateConfig(eslintConfig as any, undefined, {
      typeAware: true,
    });

    console.log(JSON.stringify(oxlintConfig, null, 2));

    // Should have overrides
    expect(oxlintConfig.overrides).toBeDefined();

    // The two overrides with identical rules should be merged into one
    const overrides = oxlintConfig.overrides!;
    expect(overrides).toHaveLength(1);

    // The merged override should include all relevant file patterns.
    const mergedOverride = overrides[0];
    expect(mergedOverride.files).toHaveLength(2);
    expect(mergedOverride.files).toContain('**/*.ts');
    expect(mergedOverride.files).toContain('**/*.tsx');
    expect(mergedOverride.rules?.['@typescript-eslint/no-deprecated']).toBe(
      'error'
    );
    expect(mergedOverride.plugins).toBeDefined();
    expect(mergedOverride.plugins).toContain('typescript');
  });
});

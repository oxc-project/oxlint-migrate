import { defineConfig } from 'eslint/config';
import { describe, expect, test } from 'vitest';
import migrateConfig from '../../src/index.js';

const eslintConfig = defineConfig([
  {
    rules: {
      'no-unused-vars': 'error',
    },
  },
  // These intentionally have identical rulesets to test merging when converting, this can happen in some complex
  // configs, but it's easier to understand with an arbitrary example like this.
  // As long as the plugins and rules and globals are all the same, these can
  // be safely merged by merging the file globs.
  {
    files: ['**/*.ts'],
    rules: {
      'arrow-body-style': 'error',
    },
  },
  {
    files: ['**/*.mts', '**/*.cts'],
    rules: {
      'arrow-body-style': 'error',
    },
  },
]);

describe('override-merging', () => {
  test('should merge identical override rulesets by combining the file globs', async () => {
    const oxlintConfig = await migrateConfig(eslintConfig);

    // Should have the base rule from the first override
    expect(oxlintConfig.rules?.['no-unused-vars']).toBe('error');

    // Should have overrides for the remaining patterns
    expect(oxlintConfig.overrides).toBeDefined();

    // The two overrides with identical rules should be merged into one
    const arrowBodyStyleOverrides = oxlintConfig.overrides!;
    expect(arrowBodyStyleOverrides).toHaveLength(1);

    // The merged override should include all relevant file patterns.
    const mergedOverride = arrowBodyStyleOverrides[0];
    expect(mergedOverride.files).toHaveLength(3);
    expect(mergedOverride.files).toContain('**/*.ts');
    expect(mergedOverride.files).toContain('**/*.mts');
    expect(mergedOverride.files).toContain('**/*.cts');
    expect(mergedOverride.rules?.['arrow-body-style']).toBe('error');
  });
});

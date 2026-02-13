import { describe, expect, it } from 'vitest';
import {
  formatCategorySummary,
  detectMissingFlags,
  formatMigrationOutput,
  type MigrationOutputData,
} from './output-formatter.js';
import { SkippedCategoryGroup } from '../src/types.js';

describe('formatCategorySummary', () => {
  it('should format with examples when count <= maxExamples', () => {
    const result = formatCategorySummary(
      2,
      'nursery',
      ['getter-return', 'no-undef'],
      false
    );

    expect(result).toBe(
      '     -   2 Nursery     (Experimental: getter-return, no-undef)\n'
    );
  });

  it('should add "and more" when count > maxExamples and showAll=false', () => {
    const result = formatCategorySummary(
      5,
      'type-aware',
      ['rule1', 'rule2', 'rule3', 'rule4', 'rule5'],
      false
    );

    expect(result).toBe(
      '     -   5 Type-aware  (Requires TS info: rule1, rule2, rule3, and more)\n'
    );
  });

  it('should show all rules in vertical list when showAll=true', () => {
    const result = formatCategorySummary(
      5,
      'type-aware',
      ['rule1', 'rule2', 'rule3', 'rule4', 'rule5'],
      true
    );

    expect(result).toBe(
      '     - 5 Type-aware\n' +
        '       - rule1\n' +
        '       - rule2\n' +
        '       - rule3\n' +
        '       - rule4\n' +
        '       - rule5\n'
    );
  });

  it('should handle single rule', () => {
    const result = formatCategorySummary(
      1,
      'unsupported',
      ['prefer-const'],
      false
    );

    expect(result).toBe('     -   1 Unsupported (prefer-const)\n');
  });

  it('should show explanations for unsupported rules', () => {
    const result = formatCategorySummary(
      2,
      'unsupported',
      ['camelcase', 'some-unknown-rule'],
      true
    );

    expect(result).toBe(
      '     - 2 Unsupported\n' +
        '       - camelcase: Superseded by `@typescript-eslint/naming-convention`, which accomplishes the same behavior with more flexibility.\n' +
        '       - some-unknown-rule\n'
    );
  });
});

describe('detectMissingFlags', () => {
  it('should detect both missing flags', () => {
    const byCategory: SkippedCategoryGroup = {
      nursery: ['rule1'],
      'type-aware': ['rule2'],
      'js-plugins': ['rule3'],
      unsupported: [],
    };
    const cliOptions = {
      withNursery: false,
      typeAware: false,
      jsPlugins: false,
    };

    const result = detectMissingFlags(byCategory, cliOptions);

    expect(result).toEqual(['--with-nursery', '--type-aware', '--js-plugins']);
  });

  it('should detect only --with-nursery when needed', () => {
    const byCategory: SkippedCategoryGroup = {
      nursery: ['rule1'],
      'type-aware': [],
      'js-plugins': [],
      unsupported: [],
    };
    const cliOptions = {
      withNursery: false,
      typeAware: false,
      jsPlugins: false,
    };

    const result = detectMissingFlags(byCategory, cliOptions);

    expect(result).toEqual(['--with-nursery']);
  });

  it('should detect only --type-aware when needed', () => {
    const byCategory: SkippedCategoryGroup = {
      nursery: [],
      'type-aware': ['rule1'],
      'js-plugins': [],
      unsupported: [],
    };
    const cliOptions = {
      withNursery: false,
      typeAware: false,
      jsPlugins: false,
    };

    const result = detectMissingFlags(byCategory, cliOptions);

    expect(result).toEqual(['--type-aware']);
  });

  it('should return empty when flags are already enabled', () => {
    const byCategory: SkippedCategoryGroup = {
      nursery: ['rule1'],
      'type-aware': ['rule2'],
      'js-plugins': ['rule3'],
      unsupported: [],
    };
    const cliOptions = { withNursery: true, typeAware: true, jsPlugins: true };

    const result = detectMissingFlags(byCategory, cliOptions);

    expect(result).toEqual([]);
  });

  it('should not suggest flags when no rules in that category', () => {
    const byCategory: SkippedCategoryGroup = {
      nursery: [],
      'type-aware': [],
      'js-plugins': [],
      unsupported: ['rule1'],
    };
    const cliOptions = {
      withNursery: false,
      typeAware: false,
      jsPlugins: false,
    };

    const result = detectMissingFlags(byCategory, cliOptions);

    expect(result).toEqual([]);
  });
});

describe('formatMigrationOutput', () => {
  it('should format complete output with all sections', () => {
    const data: MigrationOutputData = {
      outputFileName: '.oxlintrc.json',
      enabledRulesCount: 24,
      skippedRulesByCategory: {
        nursery: ['getter-return', 'no-undef', 'no-unreachable'],
        'type-aware': ['await-thenable'],
        'js-plugins': ['js-plugin-rule1', 'js-plugin-rule2'],
        unsupported: ['prefer-const'],
      },
      cliOptions: {
        withNursery: false,
        typeAware: false,
        jsPlugins: false,
        details: false,
      },
      eslintConfigPath: 'eslint.config.mjs',
    };

    expect(formatMigrationOutput(data)).toMatchSnapshot();
  });

  it('should handle no enabled rules', () => {
    const data: MigrationOutputData = {
      outputFileName: '.oxlintrc.json',
      enabledRulesCount: 0,
      skippedRulesByCategory: {
        nursery: [],
        'type-aware': [],
        'js-plugins': [],
        unsupported: ['rule1'],
      },
      cliOptions: {
        withNursery: false,
        typeAware: false,
        jsPlugins: false,
        details: false,
      },
    };

    expect(formatMigrationOutput(data)).toMatchSnapshot();
  });

  it('should handle no skipped rules', () => {
    const data: MigrationOutputData = {
      outputFileName: '.oxlintrc.json',
      enabledRulesCount: 10,
      skippedRulesByCategory: {
        nursery: [],
        'type-aware': [],
        'js-plugins': [],
        unsupported: [],
      },
      cliOptions: {
        withNursery: false,
        typeAware: false,
        jsPlugins: false,
        details: false,
      },
    };

    expect(formatMigrationOutput(data)).toMatchSnapshot();
  });

  it('should not show missing flags section when flags are enabled', () => {
    const data: MigrationOutputData = {
      outputFileName: '.oxlintrc.json',
      enabledRulesCount: 24,
      skippedRulesByCategory: {
        nursery: ['getter-return'],
        'type-aware': ['await-thenable'],
        'js-plugins': ['js-plugin-rule1'],
        unsupported: [],
      },
      cliOptions: {
        withNursery: true,
        typeAware: true,
        jsPlugins: true,
        details: false,
      },
    };

    expect(formatMigrationOutput(data)).toMatchSnapshot();
  });

  it('should show only nursery rules when type-aware is empty', () => {
    const data: MigrationOutputData = {
      outputFileName: '.oxlintrc.json',
      enabledRulesCount: 10,
      skippedRulesByCategory: {
        nursery: ['getter-return', 'no-undef'],
        'type-aware': [],
        'js-plugins': [],
        unsupported: [],
      },
      cliOptions: {
        withNursery: false,
        typeAware: false,
        jsPlugins: false,
        details: false,
      },
    };

    expect(formatMigrationOutput(data)).toMatchSnapshot();
  });

  it('should handle more than 3 rules with "and more" in summary mode', () => {
    const data: MigrationOutputData = {
      outputFileName: '.oxlintrc.json',
      enabledRulesCount: 10,
      skippedRulesByCategory: {
        nursery: ['rule1', 'rule2', 'rule3', 'rule4'],
        'type-aware': [],
        'js-plugins': [],
        unsupported: [],
      },
      cliOptions: {
        withNursery: false,
        typeAware: false,
        jsPlugins: false,
        details: false,
      },
    };

    expect(formatMigrationOutput(data)).toMatchSnapshot();
  });

  it('should show all rules in vertical list when details=true', () => {
    const data: MigrationOutputData = {
      outputFileName: '.oxlintrc.json',
      enabledRulesCount: 10,
      skippedRulesByCategory: {
        nursery: ['rule1', 'rule2', 'rule3', 'rule4'],
        'type-aware': [],
        'js-plugins': [],
        unsupported: [],
      },
      cliOptions: {
        withNursery: false,
        typeAware: false,
        jsPlugins: false,
        details: true,
      },
    };

    expect(formatMigrationOutput(data)).toMatchSnapshot();
  });

  it('should show vertical list for multiple categories when details=true', () => {
    const data: MigrationOutputData = {
      outputFileName: '.oxlintrc.json',
      enabledRulesCount: 24,
      skippedRulesByCategory: {
        nursery: ['getter-return', 'no-undef'],
        'type-aware': ['await-thenable'],
        'js-plugins': ['js-plugin-rule1'],
        unsupported: ['prefer-const', 'camelcase'],
      },
      cliOptions: {
        withNursery: false,
        typeAware: false,
        jsPlugins: false,
        details: true,
      },
    };

    expect(formatMigrationOutput(data)).toMatchSnapshot();
  });

  it('should show --details hint when any category has > 3 rules', () => {
    const data: MigrationOutputData = {
      outputFileName: '.oxlintrc.json',
      enabledRulesCount: 10,
      skippedRulesByCategory: {
        nursery: ['rule1', 'rule2', 'rule3', 'rule4', 'rule5'],
        'type-aware': ['rule6'],
        'js-plugins': ['rule7'],
        unsupported: ['rule8'],
      },
      cliOptions: {
        withNursery: false,
        typeAware: false,
        jsPlugins: false,
        details: false,
      },
    };

    expect(formatMigrationOutput(data)).toMatchSnapshot();
  });

  it('should NOT show --details hint when all categories have <= 3 rules', () => {
    const data: MigrationOutputData = {
      outputFileName: '.oxlintrc.json',
      enabledRulesCount: 10,
      skippedRulesByCategory: {
        nursery: ['rule1', 'rule2', 'rule3'],
        'type-aware': ['rule4'],
        'js-plugins': ['rule5'],
        unsupported: ['rule6', 'rule7'],
      },
      cliOptions: {
        withNursery: false,
        typeAware: false,
        jsPlugins: false,
        details: false,
      },
    };

    expect(formatMigrationOutput(data)).toMatchSnapshot();
  });

  it('should NOT show --details hint when details=true', () => {
    const data: MigrationOutputData = {
      outputFileName: '.oxlintrc.json',
      enabledRulesCount: 10,
      skippedRulesByCategory: {
        nursery: ['rule1', 'rule2', 'rule3', 'rule4'],
        'type-aware': [],
        'js-plugins': [],
        unsupported: [],
      },
      cliOptions: {
        withNursery: false,
        typeAware: false,
        jsPlugins: false,
        details: true,
      },
    };

    expect(formatMigrationOutput(data)).toMatchSnapshot();
  });
});

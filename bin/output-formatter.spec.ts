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
      '     -   2 Nursery         (Experimental: getter-return, no-undef)\n'
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
      '     -   5 Type-aware      (Requires TS info: rule1, rule2, rule3, and more)\n'
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

  it('should handle single not-implemented rule', () => {
    const result = formatCategorySummary(
      1,
      'not-implemented',
      ['prefer-const'],
      false
    );

    expect(result).toBe(
      '     -   1 Not Implemented (Not yet in oxlint: prefer-const)\n'
    );
  });

  it('should show unsupported rules with explanations in details mode', () => {
    const result = formatCategorySummary(1, 'unsupported', ['camelcase'], true);

    expect(result).toBe(
      '     - 1 Unsupported\n' +
        '       - camelcase: Superseded by `@typescript-eslint/naming-convention`, which accomplishes the same behavior with more flexibility.\n'
    );
  });

  it('should show unsupported rule with explanation', () => {
    const result = formatCategorySummary(1, 'unsupported', ['camelcase'], true);

    expect(result).toBe(
      '     - 1 Unsupported\n' +
        '       - camelcase: Superseded by `@typescript-eslint/naming-convention`, which accomplishes the same behavior with more flexibility.\n'
    );
  });

  it('should show not-implemented rules without explanations', () => {
    const result = formatCategorySummary(
      2,
      'not-implemented',
      ['some-rule', 'another-rule'],
      true
    );

    expect(result).toBe(
      '     - 2 Not Implemented\n' +
        '       - some-rule\n' +
        '       - another-rule\n'
    );
  });

  it('should show explanations for react-hooks/ rules aliased from react/', () => {
    const result = formatCategorySummary(
      1,
      'unsupported',
      ['react-hooks/immutability'],
      true
    );

    expect(result).toContain('react-hooks/immutability: ');
    expect(result).toContain('React Compiler');
  });

  it('should show explanations for import-x/ rules aliased from import/', () => {
    const result = formatCategorySummary(
      1,
      'unsupported',
      ['import-x/no-unresolved'],
      true
    );

    expect(result).toContain('import-x/no-unresolved: ');
    expect(result).toContain('false positives');
  });
});

describe('detectMissingFlags', () => {
  it('should detect both missing flags', () => {
    const byCategory: SkippedCategoryGroup = {
      nursery: ['rule1'],
      'type-aware': ['rule2'],
      'not-implemented': [],
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
      'not-implemented': [],
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
      'not-implemented': [],
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
      'not-implemented': [],
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
      'not-implemented': [],
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
        'not-implemented': ['prefer-const'],
        'js-plugins': ['js-plugin-rule1', 'js-plugin-rule2'],
        unsupported: [],
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
        'not-implemented': [],
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
        'not-implemented': [],
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
        'not-implemented': [],
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
        'not-implemented': [],
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
        'not-implemented': [],
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
        'not-implemented': [],
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
        'not-implemented': ['prefer-const'],
        'js-plugins': ['js-plugin-rule1'],
        unsupported: ['camelcase'],
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
        'not-implemented': ['rule8'],
        'js-plugins': ['rule7'],
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

  it('should NOT show --details hint when all categories have <= 3 rules', () => {
    const data: MigrationOutputData = {
      outputFileName: '.oxlintrc.json',
      enabledRulesCount: 10,
      skippedRulesByCategory: {
        nursery: ['rule1', 'rule2', 'rule3'],
        'type-aware': ['rule4'],
        'not-implemented': ['rule6', 'rule7'],
        'js-plugins': ['rule5'],
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

  it('should NOT show --details hint when details=true', () => {
    const data: MigrationOutputData = {
      outputFileName: '.oxlintrc.json',
      enabledRulesCount: 10,
      skippedRulesByCategory: {
        nursery: ['rule1', 'rule2', 'rule3', 'rule4'],
        'type-aware': [],
        'not-implemented': [],
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

import { describe, expect, it, vi } from 'vitest';
import {
  formatCategorySummary,
  detectMissingFlags,
  formatMigrationOutput,
  displayMigrationResult,
  type MigrationOutputData,
} from './output-formatter.js';
import { SkippedCategoryGroup } from '../src/types.js';

describe('formatCategorySummary', () => {
  it('should format with examples when count <= maxExamples', () => {
    const result = formatCategorySummary(
      2,
      'Nursery',
      ['getter-return', 'no-undef'],
      false,
      3
    );

    expect(result).toBe('   - 2 Nursery (getter-return, no-undef)\n');
  });

  it('should add "etc." when count > maxExamples and showAll=false', () => {
    const result = formatCategorySummary(
      5,
      'Type-aware',
      ['rule1', 'rule2', 'rule3', 'rule4', 'rule5'],
      false,
      3
    );

    expect(result).toBe('   - 5 Type-aware (rule1, rule2, rule3, etc.)\n');
  });

  it('should show all rules in vertical list when showAll=true', () => {
    const result = formatCategorySummary(
      5,
      'Type-aware',
      ['rule1', 'rule2', 'rule3', 'rule4', 'rule5'],
      true,
      3
    );

    expect(result).toBe(
      '   - 5 Type-aware\n' +
        '     - rule1\n' +
        '     - rule2\n' +
        '     - rule3\n' +
        '     - rule4\n' +
        '     - rule5\n'
    );
  });

  it('should handle single rule', () => {
    const result = formatCategorySummary(1, 'Unsupported', ['prefer-const']);

    expect(result).toBe('   - 1 Unsupported (prefer-const)\n');
  });

  it('should use custom maxExamples', () => {
    const result = formatCategorySummary(
      3,
      'Nursery',
      ['rule1', 'rule2', 'rule3'],
      false,
      2
    );

    expect(result).toBe('   - 3 Nursery (rule1, rule2, etc.)\n');
  });
});

describe('detectMissingFlags', () => {
  it('should detect both missing flags', () => {
    const byCategory: SkippedCategoryGroup = {
      nursery: ['rule1'],
      'type-aware': ['rule2'],
      unsupported: [],
    };
    const cliOptions = { withNursery: false, typeAware: false };

    const result = detectMissingFlags(byCategory, cliOptions);

    expect(result).toEqual(['--with-nursery', '--type-aware']);
  });

  it('should detect only --with-nursery when needed', () => {
    const byCategory: SkippedCategoryGroup = {
      nursery: ['rule1'],
      'type-aware': [],
      unsupported: [],
    };
    const cliOptions = { withNursery: false, typeAware: false };

    const result = detectMissingFlags(byCategory, cliOptions);

    expect(result).toEqual(['--with-nursery']);
  });

  it('should detect only --type-aware when needed', () => {
    const byCategory: SkippedCategoryGroup = {
      nursery: [],
      'type-aware': ['rule1'],
      unsupported: [],
    };
    const cliOptions = { withNursery: false, typeAware: false };

    const result = detectMissingFlags(byCategory, cliOptions);

    expect(result).toEqual(['--type-aware']);
  });

  it('should return empty when flags are already enabled', () => {
    const byCategory: SkippedCategoryGroup = {
      nursery: ['rule1'],
      'type-aware': ['rule2'],
      unsupported: [],
    };
    const cliOptions = { withNursery: true, typeAware: true };

    const result = detectMissingFlags(byCategory, cliOptions);

    expect(result).toEqual([]);
  });

  it('should not suggest flags when no rules in that category', () => {
    const byCategory: SkippedCategoryGroup = {
      nursery: [],
      'type-aware': [],
      unsupported: ['rule1'],
    };
    const cliOptions = { withNursery: false, typeAware: false };

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
        unsupported: ['prefer-const'],
      },
      cliOptions: { withNursery: false, typeAware: false },
      eslintConfigPath: 'eslint.config.mjs',
    };

    const result = formatMigrationOutput(data);

    expect(result).toContain('.oxlintrc.json created with 24 rules.');
    expect(result).toContain('5 rules skipped:');
    expect(result).toContain('3 Nursery');
    expect(result).toContain(
      'Experimental: getter-return, no-undef, no-unreachable'
    );
    expect(result).toContain('1 Type-aware');
    expect(result).toContain('Requires TS info: await-thenable');
    expect(result).toContain('1 Unsupported');
    expect(result).toContain('prefer-const');
    expect(result).toContain('Re-run with flags to include more:');
    expect(result).toContain(
      'npx @oxlint/migrate eslint.config.mjs --with-nursery --type-aware'
    );
    expect(result).toContain('Next:');
    expect(result).toContain('npx oxlint .');
  });

  it('should handle no enabled rules', () => {
    const data: MigrationOutputData = {
      outputFileName: '.oxlintrc.json',
      enabledRulesCount: 0,
      skippedRulesByCategory: {
        nursery: [],
        'type-aware': [],
        unsupported: ['rule1'],
      },
      cliOptions: { withNursery: false, typeAware: false },
    };

    const result = formatMigrationOutput(data);

    expect(result).not.toContain('Next:');
    expect(result).toContain('1 rules skipped:');
  });

  it('should handle no skipped rules', () => {
    const data: MigrationOutputData = {
      outputFileName: '.oxlintrc.json',
      enabledRulesCount: 10,
      skippedRulesByCategory: {
        nursery: [],
        'type-aware': [],
        unsupported: [],
      },
      cliOptions: { withNursery: false, typeAware: false },
    };

    const result = formatMigrationOutput(data);

    expect(result).toContain('.oxlintrc.json created with 10 rules.');
    expect(result).not.toContain('skipped');
    expect(result).toContain('Next:');
  });

  it('should not show missing flags section when flags are enabled', () => {
    const data: MigrationOutputData = {
      outputFileName: '.oxlintrc.json',
      enabledRulesCount: 24,
      skippedRulesByCategory: {
        nursery: ['getter-return'],
        'type-aware': ['await-thenable'],
        unsupported: [],
      },
      cliOptions: { withNursery: true, typeAware: true },
    };

    const result = formatMigrationOutput(data);

    expect(result).not.toContain('Re-run with flags');
  });

  it('should handle eslintConfigPath being undefined', () => {
    const data: MigrationOutputData = {
      outputFileName: '.oxlintrc.json',
      enabledRulesCount: 10,
      skippedRulesByCategory: {
        nursery: ['rule1'],
        'type-aware': [],
        unsupported: [],
      },
      cliOptions: { withNursery: false, typeAware: false },
      eslintConfigPath: undefined,
    };

    const result = formatMigrationOutput(data);

    expect(result).toContain('npx @oxlint/migrate --with-nursery');
    expect(result).not.toContain('eslint.config');
  });

  it('should show only nursery rules when type-aware is empty', () => {
    const data: MigrationOutputData = {
      outputFileName: '.oxlintrc.json',
      enabledRulesCount: 10,
      skippedRulesByCategory: {
        nursery: ['getter-return', 'no-undef'],
        'type-aware': [],
        unsupported: [],
      },
      cliOptions: { withNursery: false, typeAware: false },
    };

    const result = formatMigrationOutput(data);

    expect(result).toContain('2 Nursery');
    expect(result).not.toContain('Type-aware');
    expect(result).not.toContain('Unsupported');
  });

  it('should handle more than 3 rules with "etc." in summary mode', () => {
    const data: MigrationOutputData = {
      outputFileName: '.oxlintrc.json',
      enabledRulesCount: 10,
      skippedRulesByCategory: {
        nursery: ['rule1', 'rule2', 'rule3', 'rule4'],
        'type-aware': [],
        unsupported: [],
      },
      cliOptions: { withNursery: false, typeAware: false },
    };

    const result = formatMigrationOutput(data);

    expect(result).toContain('4 Nursery');
    expect(result).toContain('rule1, rule2, rule3, etc.');
    expect(result).not.toContain('rule4');
  });

  it('should show all rules in vertical list when details=true', () => {
    const data: MigrationOutputData = {
      outputFileName: '.oxlintrc.json',
      enabledRulesCount: 10,
      skippedRulesByCategory: {
        nursery: ['rule1', 'rule2', 'rule3', 'rule4'],
        'type-aware': [],
        unsupported: [],
      },
      cliOptions: { withNursery: false, typeAware: false, details: true },
    };

    const result = formatMigrationOutput(data);

    expect(result).toContain('4 Nursery');
    expect(result).toContain('     - rule1');
    expect(result).toContain('     - rule2');
    expect(result).toContain('     - rule3');
    expect(result).toContain('     - rule4');
    expect(result).not.toContain('etc.');
    expect(result).not.toContain('Experimental:');
  });

  it('should show vertical list for multiple categories when details=true', () => {
    const data: MigrationOutputData = {
      outputFileName: '.oxlintrc.json',
      enabledRulesCount: 24,
      skippedRulesByCategory: {
        nursery: ['getter-return', 'no-undef'],
        'type-aware': ['await-thenable'],
        unsupported: ['prefer-const', 'camelcase'],
      },
      cliOptions: { withNursery: false, typeAware: false, details: true },
    };

    const result = formatMigrationOutput(data);

    // Check Nursery section
    expect(result).toContain('2 Nursery');
    expect(result).toContain('     - getter-return');
    expect(result).toContain('     - no-undef');
    expect(result).not.toContain('Experimental:');

    // Check Type-aware section
    expect(result).toContain('1 Type-aware');
    expect(result).toContain('     - await-thenable');
    expect(result).not.toContain('Requires TS info:');

    // Check Unsupported section
    expect(result).toContain('2 Unsupported');
    expect(result).toContain('     - prefer-const');
    expect(result).toContain('     - camelcase');
  });

  it('should show --details hint when any category has > 3 rules', () => {
    const data: MigrationOutputData = {
      outputFileName: '.oxlintrc.json',
      enabledRulesCount: 10,
      skippedRulesByCategory: {
        nursery: ['rule1', 'rule2', 'rule3', 'rule4', 'rule5'], // > 3
        'type-aware': ['rule6'],
        unsupported: ['rule7', 'rule8'],
      },
      cliOptions: { withNursery: false, typeAware: false },
    };

    const result = formatMigrationOutput(data);

    expect(result).toContain('💡 Use --details to see all skipped rules');
  });

  it('should NOT show --details hint when all categories have <= 3 rules', () => {
    const data: MigrationOutputData = {
      outputFileName: '.oxlintrc.json',
      enabledRulesCount: 10,
      skippedRulesByCategory: {
        nursery: ['rule1', 'rule2', 'rule3'], // exactly 3
        'type-aware': ['rule4'],
        unsupported: ['rule5', 'rule6'],
      },
      cliOptions: { withNursery: false, typeAware: false },
    };

    const result = formatMigrationOutput(data);

    expect(result).not.toContain('💡 Use --details');
  });

  it('should NOT show --details hint when details=true', () => {
    const data: MigrationOutputData = {
      outputFileName: '.oxlintrc.json',
      enabledRulesCount: 10,
      skippedRulesByCategory: {
        nursery: ['rule1', 'rule2', 'rule3', 'rule4'], // > 3 but details=true
        'type-aware': [],
        unsupported: [],
      },
      cliOptions: { withNursery: false, typeAware: false, details: true },
    };

    const result = formatMigrationOutput(data);

    expect(result).not.toContain('💡 Use --details');
  });
});

describe('displayMigrationResult', () => {
  it('should call console.log with output message', () => {
    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const consoleWarnSpy = vi
      .spyOn(console, 'warn')
      .mockImplementation(() => {});

    const outputMessage = 'Success message';
    const warnings: string[] = [];

    displayMigrationResult(outputMessage, warnings);

    expect(consoleLogSpy).toHaveBeenCalledWith(outputMessage);
    expect(consoleLogSpy).toHaveBeenCalledTimes(1);
    expect(consoleWarnSpy).not.toHaveBeenCalled();

    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  it('should call console.warn for each warning', () => {
    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const consoleWarnSpy = vi
      .spyOn(console, 'warn')
      .mockImplementation(() => {});

    const outputMessage = 'Success message';
    const warnings = [
      'warning 1: parse failed',
      'warning 2: unsupported config',
    ];

    displayMigrationResult(outputMessage, warnings);

    expect(consoleLogSpy).toHaveBeenCalledWith(outputMessage);
    expect(consoleWarnSpy).toHaveBeenCalledWith('warning 1: parse failed');
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      'warning 2: unsupported config'
    );
    expect(consoleWarnSpy).toHaveBeenCalledTimes(2);

    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  it('should handle empty warnings array', () => {
    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const consoleWarnSpy = vi
      .spyOn(console, 'warn')
      .mockImplementation(() => {});

    displayMigrationResult('message', []);

    expect(consoleLogSpy).toHaveBeenCalledTimes(1);
    expect(consoleWarnSpy).not.toHaveBeenCalled();

    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });
});

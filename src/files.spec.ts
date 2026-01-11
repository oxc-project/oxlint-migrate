import { describe, expect, test } from 'vitest';
import { processConfigFiles } from './files.js';

describe('processConfigFiles', () => {
  test('returns empty array and shouldSkip false when files is undefined', () => {
    const result = processConfigFiles(undefined);

    expect(result).toStrictEqual({
      validFiles: [],
      shouldSkip: false,
    });
  });

  test('handles single string by wrapping it in an array', () => {
    const result = processConfigFiles('**/*.js');

    expect(result).toStrictEqual({
      validFiles: ['**/*.js'],
      shouldSkip: false,
    });
  });

  test('handles array of strings without modification', () => {
    const result = processConfigFiles(['**/*.js', '**/*.ts']);

    expect(result).toStrictEqual({
      validFiles: ['**/*.js', '**/*.ts'],
      shouldSkip: false,
    });
  });

  test('separates nested arrays from simple strings and reports them', () => {
    const reporter = {
      reports: [] as string[],
      report(message: string): void {
        this.reports.push(message);
      },
      remove(_message: string): void {
        // Not used in this test
      },
      getReports(): string[] {
        return this.reports;
      },
    };

    const result = processConfigFiles(
      [
        ['**/*.ts', '**/*.tsx'], // AND pattern - unsupported
        '**/*.js', // Simple pattern - supported
      ],
      reporter
    );

    expect(result).toStrictEqual({
      validFiles: ['**/*.js'],
      shouldSkip: false,
    });

    expect(reporter.reports).toHaveLength(1);
    expect(reporter.reports[0]).toContain('AND glob patterns');
    expect(reporter.reports[0]).toContain('nested arrays');
    expect(reporter.reports[0]).toContain('**/*.ts');
  });

  test('returns shouldSkip true when all files are nested arrays', () => {
    const reporter = {
      reports: [] as string[],
      report(message: string): void {
        this.reports.push(message);
      },
      remove(_message: string): void {
        // Not used in this test
      },
      getReports(): string[] {
        return this.reports;
      },
    };

    const result = processConfigFiles(
      [
        ['**/*.ts', '**/*.tsx'],
        ['**/*.js', '**/*.jsx'],
      ],
      reporter
    );

    expect(result).toStrictEqual({
      validFiles: [],
      shouldSkip: true,
    });

    expect(reporter.reports).toHaveLength(1);
    expect(reporter.reports[0]).toContain('AND glob patterns');
  });

  test('handles multiple nested arrays correctly', () => {
    const reporter = {
      reports: [] as string[],
      report(message: string): void {
        this.reports.push(message);
      },
      remove(_message: string): void {
        // Not used in this test
      },
      getReports(): string[] {
        return this.reports;
      },
    };

    const result = processConfigFiles(
      [
        ['**/*.ts', '**/*.tsx'],
        '**/*.js',
        ['**/*.mjs', '**/*.cjs'],
        '**/*.jsx',
      ],
      reporter
    );

    expect(result).toStrictEqual({
      validFiles: ['**/*.js', '**/*.jsx'],
      shouldSkip: false,
    });

    expect(reporter.reports).toHaveLength(1);
    expect(reporter.reports[0]).toContain('**/*.ts');
    expect(reporter.reports[0]).toContain('**/*.mjs');
  });

  test('does not report when no nested arrays present', () => {
    const reporter = {
      reports: [] as string[],
      report(message: string): void {
        this.reports.push(message);
      },
      remove(_message: string): void {
        // Not used in this test
      },
      getReports(): string[] {
        return this.reports;
      },
    };

    const result = processConfigFiles(['**/*.js', '**/*.ts'], reporter);

    expect(result).toStrictEqual({
      validFiles: ['**/*.js', '**/*.ts'],
      shouldSkip: false,
    });

    expect(reporter.reports).toHaveLength(0);
  });
});

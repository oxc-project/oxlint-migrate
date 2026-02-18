import { describe, expect, test } from 'vitest';
import { processConfigFiles } from './files.js';
import { DefaultReporter } from './reporter.js';

describe('processConfigFiles', () => {
  test('handles single string by wrapping it in an array', () => {
    const result = processConfigFiles('**/*.js');

    expect(result).toStrictEqual(['**/*.js']);
  });

  test('handles array of strings without modification', () => {
    const result = processConfigFiles(['**/*.js', '**/*.ts']);

    expect(result).toStrictEqual(['**/*.js', '**/*.ts']);
  });

  test('separates nested arrays from simple strings and reports them', () => {
    const reporter = new DefaultReporter();

    const result = processConfigFiles(
      [
        ['**/*.ts', '**/*.tsx'], // AND pattern - unsupported
        '**/*.js', // Simple pattern - supported
      ],
      reporter
    );

    expect(result).toStrictEqual(['**/*.js']);

    const reports = reporter.getWarnings();
    expect(reports).toHaveLength(1);
    expect(reports[0]).toContain('AND glob patterns');
    expect(reports[0]).toContain('nested arrays');
    expect(reports[0]).toContain('**/*.ts');
  });

  test('returns empty array when all files are nested arrays', () => {
    const reporter = new DefaultReporter();

    const result = processConfigFiles(
      [
        ['**/*.ts', '**/*.tsx'],
        ['**/*.js', '**/*.jsx'],
      ],
      reporter
    );

    expect(result).toStrictEqual([]);

    const reports = reporter.getWarnings();
    expect(reports).toHaveLength(2);
    expect(reports[0]).toContain('AND glob patterns');
    expect(reports[1]).toContain('AND glob patterns');
  });

  test('handles multiple nested arrays correctly', () => {
    const reporter = new DefaultReporter();

    const result = processConfigFiles(
      [
        ['**/*.ts', '**/*.tsx'],
        '**/*.js',
        ['**/*.mjs', '**/*.cjs'],
        ['**/*.vue', '**/*.vue'],
        '**/*.jsx',
      ],
      reporter
    );

    expect(result).toStrictEqual(['**/*.js', '**/*.vue', '**/*.jsx']);

    const reports = reporter.getWarnings();
    expect(reports).toHaveLength(2);
    expect(reports[0]).toContain('**/*.ts');
    expect(reports[1]).toContain('**/*.mjs');
  });

  test('does not report when no nested arrays present', () => {
    const reporter = new DefaultReporter();

    const result = processConfigFiles(['**/*.js', '**/*.ts'], reporter);

    expect(result).toStrictEqual(['**/*.js', '**/*.ts']);

    expect(reporter.getWarnings()).toHaveLength(0);
  });
});

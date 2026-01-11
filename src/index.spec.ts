import { describe, expect, test } from 'vitest';
import main from './index.js';
import globals from 'globals';

describe('main', () => {
  test('basic', async () => {
    const result = await main([
      {
        rules: {
          'no-magic-numbers': 'error',
        },
      },
    ]);

    expect(result).toStrictEqual({
      $schema: './node_modules/oxlint/configuration_schema.json',
      categories: {
        correctness: 'off',
      },
      env: {
        builtin: true,
      },
      plugins: [],
      rules: {
        'no-magic-numbers': 'error',
      },
    });
  });

  test('2 basic configs', async () => {
    const result = await main([
      {
        rules: {
          'no-magic-numbers': 'error',
        },
      },
      {
        rules: {
          'no-loss-of-precision': 'error',
        },
      },
    ]);

    expect(result).toStrictEqual({
      $schema: './node_modules/oxlint/configuration_schema.json',
      categories: {
        correctness: 'off',
      },
      env: {
        builtin: true,
      },
      plugins: [],
      rules: {
        'no-magic-numbers': 'error',
        'no-loss-of-precision': 'error',
      },
    });
  });

  test('overlapping rules in configs', async () => {
    const result = await main([
      {
        rules: {
          'no-magic-numbers': 'warn',
        },
      },
      {
        rules: {
          'no-magic-numbers': 'off',
        },
      },
    ]);

    expect(result).toStrictEqual({
      $schema: './node_modules/oxlint/configuration_schema.json',
      categories: {
        correctness: 'off',
      },
      env: {
        builtin: true,
      },
      plugins: [],
      rules: {},
    });
  });

  test('1 basic config, 1 file config', async () => {
    const result = await main([
      {
        rules: {
          'no-magic-numbers': 'error',
        },
      },
      {
        // ToDo: eslint-plugin-typescript will probably generate this when using their build method
        files: ['*.ts'],
        rules: {
          'no-loss-of-precision': 'error',
        },
      },
    ]);

    expect(result).toStrictEqual({
      $schema: './node_modules/oxlint/configuration_schema.json',
      categories: {
        correctness: 'off',
      },
      env: {
        builtin: true,
      },
      overrides: [
        {
          files: ['*.ts'],
          rules: {
            'no-loss-of-precision': 'error',
          },
        },
      ],
      plugins: [],
      rules: {
        'no-magic-numbers': 'error',
      },
    });
  });

  test('globals', async () => {
    const result = await main([
      {
        languageOptions: {
          globals: {
            Foo: 'writable',
            Foo2: 'writeable',
            Bar: 'readable',
            Bar2: 'writeable',
            Baz: 'off',
            Bux: true,
            Bux2: false,
          },
        },
      },
    ]);

    expect(result).toStrictEqual({
      $schema: './node_modules/oxlint/configuration_schema.json',
      categories: {
        correctness: 'off',
      },
      env: {
        builtin: true,
      },
      globals: {
        Foo: 'writable',
        Foo2: 'writable',
        Bar: 'readonly',
        Bar2: 'writable',
        Baz: 'off',
        Bux: 'writable',
        Bux2: 'readonly',
      },
      plugins: [],
    });
  });

  test('auto removes globals when env is detected', async () => {
    const result = await main([
      {
        languageOptions: {
          ecmaVersion: 2022,
          globals: globals.es2022,
        },
      },
    ]);

    // ToDo: just detect the oldest one and skip all others
    // we can not be sure that es2022 is supported, when no ecmaVersion is provided
    // the match in globals package could possible detect es2021 support.
    expect(result).toStrictEqual({
      $schema: './node_modules/oxlint/configuration_schema.json',
      categories: {
        correctness: 'off',
      },
      env: {
        builtin: true,
        es2024: true,
      },
      plugins: [],
    });
  });

  test('detects and reports nested arrays in files field as unsupported', async () => {
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

    const result = await main(
      [
        {
          rules: {
            'no-magic-numbers': 'error',
          },
        },
        {
          // ESLint flat config with nested arrays (AND glob patterns)
          files: [
            ['**/*.ts', '**/*.tsx'], // AND pattern - unsupported
            '**/*.js', // Simple pattern - supported
          ],
          rules: {
            'no-loss-of-precision': 'error',
          },
        },
      ],
      undefined,
      { reporter }
    );

    // Should only include the simple string pattern, not the nested array
    expect(result).toStrictEqual({
      $schema: './node_modules/oxlint/configuration_schema.json',
      categories: {
        correctness: 'off',
      },
      env: {
        builtin: true,
      },
      overrides: [
        {
          files: ['**/*.js'],
          rules: {
            'no-loss-of-precision': 'error',
          },
        },
      ],
      plugins: [],
      rules: {
        'no-magic-numbers': 'error',
      },
    });

    // Should report the nested array as unsupported
    expect(reporter.reports).toHaveLength(1);
    expect(reporter.reports[0]).toContain('AND glob patterns');
    expect(reporter.reports[0]).toContain('nested arrays');
  });

  test('skips config when all files are nested arrays', async () => {
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

    const result = await main(
      [
        {
          rules: {
            'no-magic-numbers': 'error',
          },
        },
        {
          // Only nested arrays (AND patterns) - all unsupported
          files: [
            ['**/*.ts', '**/*.tsx'],
            ['**/*.js', '**/*.jsx'],
          ],
          rules: {
            'no-loss-of-precision': 'error',
          },
        },
      ],
      undefined,
      { reporter }
    );

    // Should not create an override since all files were nested arrays
    expect(result).toStrictEqual({
      $schema: './node_modules/oxlint/configuration_schema.json',
      categories: {
        correctness: 'off',
      },
      env: {
        builtin: true,
      },
      plugins: [],
      rules: {
        'no-magic-numbers': 'error',
      },
    });

    // Should report the nested arrays as unsupported
    expect(reporter.reports).toHaveLength(1);
    expect(reporter.reports[0]).toContain('AND glob patterns');
  });
});

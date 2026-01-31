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

  test('rule with options then same rule without options should preserve options', async () => {
    const result = await main([
      {
        rules: {
          'no-magic-numbers': ['error', { ignoreArrayIndexes: true }],
        },
      },
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
        'no-magic-numbers': ['error', { ignoreArrayIndexes: true }],
      },
    });
  });

  test('rule with options then same rule with different severity but no options should preserve options', async () => {
    const result = await main([
      {
        rules: {
          'no-magic-numbers': ['error', { ignoreArrayIndexes: true }],
        },
      },
      {
        rules: {
          'no-magic-numbers': 'warn',
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
        'no-magic-numbers': ['warn', { ignoreArrayIndexes: true }],
      },
    });
  });

  test('rule with options then same rule with different options should override', async () => {
    const result = await main([
      {
        rules: {
          'no-magic-numbers': ['error', { ignoreArrayIndexes: true }],
        },
      },
      {
        rules: {
          'no-magic-numbers': ['error', { ignoreArrayIndexes: false }],
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
        'no-magic-numbers': ['error', { ignoreArrayIndexes: false }],
      },
    });
  });

  test('rule with options then same rule turned off should not preserve options', async () => {
    const result = await main([
      {
        rules: {
          'no-magic-numbers': ['error', { ignoreArrayIndexes: true }],
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
      rules: {}, // Rule is removed when turned off
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

  test('base config with options, file override with severity only should preserve options', async () => {
    const result = await main([
      {
        rules: {
          'no-magic-numbers': ['error', { ignore: [5, 7] }],
        },
      },
      {
        files: ['**/src/**'],
        rules: {
          'no-magic-numbers': ['error'],
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
          files: ['**/src/**'],
          rules: {
            'no-magic-numbers': ['error', { ignore: [5, 7] }],
          },
        },
      ],
      plugins: [],
      rules: {
        'no-magic-numbers': ['error', { ignore: [5, 7] }],
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
});

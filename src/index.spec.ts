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
        Foo: 'writeable',
        Foo2: 'writeable',
        Bar: 'readonly',
        Bar2: 'writeable',
        Baz: 'off',
        Bux: 'writeable',
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

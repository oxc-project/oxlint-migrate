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

  test('adds options.typeAware when type-aware rules are detected', async () => {
    const result = await main(
      [
        {
          rules: {
            '@typescript-eslint/no-floating-promises': 'error',
          },
        },
      ],
      undefined,
      { typeAware: true }
    );

    expect(result).toStrictEqual({
      $schema: './node_modules/oxlint/configuration_schema.json',
      categories: {
        correctness: 'off',
      },
      env: {
        builtin: true,
      },
      options: {
        typeAware: true,
      },
      plugins: ['typescript'],
      rules: {
        '@typescript-eslint/no-floating-promises': 'error',
      },
    });
  });

  test('does not add options.typeAware when type-aware flag is false', async () => {
    const result = await main(
      [
        {
          rules: {
            '@typescript-eslint/no-floating-promises': 'error',
          },
        },
      ],
      undefined,
      { typeAware: false }
    );

    expect(result).toStrictEqual({
      $schema: './node_modules/oxlint/configuration_schema.json',
      categories: {
        correctness: 'off',
      },
      env: {
        builtin: true,
      },
      plugins: [],
    });
  });

  test('does not add options.typeAware when no type-aware rules are detected', async () => {
    const result = await main(
      [
        {
          rules: {
            'no-magic-numbers': 'error',
          },
        },
      ],
      undefined,
      { typeAware: true }
    );

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

  test('enables options.typeAware even if the type-aware rules are only in overrides', async () => {
    const result = await main(
      [
        {
          rules: {
            'no-magic-numbers': 'error',
          },
        },
        {
          files: ['*.ts'],
          rules: {
            '@typescript-eslint/no-floating-promises': 'error',
          },
        },
      ],
      undefined,
      { typeAware: true }
    );

    expect(result).toStrictEqual({
      $schema: './node_modules/oxlint/configuration_schema.json',
      categories: {
        correctness: 'off',
      },
      env: {
        builtin: true,
      },
      options: {
        typeAware: true,
      },
      rules: {
        'no-magic-numbers': 'error',
      },
      overrides: [
        {
          files: ['*.ts'],
          plugins: ['typescript'],
          rules: {
            '@typescript-eslint/no-floating-promises': 'error',
          },
        },
      ],
      plugins: [],
    });
  });
});

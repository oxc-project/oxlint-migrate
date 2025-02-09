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
      env: {
        builtin: true,
      },
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
      env: {
        builtin: true,
      },
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
      env: {
        builtin: true,
        chai: true, // ToDo: why?
        phantomjs: true, // ToDo: why?
      },
      globals: {
        Foo: 'writable',
        Foo2: 'writeable',
        Bar: 'readable',
        Bar2: 'writeable',
        Baz: 'off',
        Bux: true,
        Bux2: false,
      }
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
      env: {
        builtin: true,
        chai: true, // ToDo: why?
        es2015: true,
        es2016: true,
        es2017: true,
        es2018: true,
        es2019: true,
        es2020: true,
        es2021: true,
        es2022: true,
        es2023: true,
        es2024: true,
        es3: true,
        es5: true,
        phantomjs: true, // ToDo: why?
      }
    });
  });
});

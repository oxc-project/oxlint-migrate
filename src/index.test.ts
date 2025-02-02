import { describe, expect, test } from 'vitest';
import main from './index.js';

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
      },
      globals: {
        Foo: 'writable',
        Foo2: 'writeable',
        Bar: 'readable',
        Bar2: 'writeable',
        Baz: 'off',
        Bux: true,
        Bux2: false,
      },
      rules: {},
    });
  });
});

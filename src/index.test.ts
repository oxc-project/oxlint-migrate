import { describe, expect, test } from 'vitest';
import main from './index.js';

describe('main', () => {
  test('basic', () => {
    const result = main([
      {
        rules: {
          'no-magic-numbers': 'error',
        },
      },
    ]);

    expect(result).toStrictEqual({
      rules: {
        'no-magic-numbers': 'error',
      },
    });
  });

  test('2 basic configs', () => {
    const result = main([
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
      rules: {
        'no-magic-numbers': 'error',
        'no-loss-of-precision': 'error',
      },
    });
  });

  test('1 basic config, 1 file config', () => {
    const result = main([
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
});

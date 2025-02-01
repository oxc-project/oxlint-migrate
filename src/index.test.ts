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
});

import { expect, test } from 'vitest';
import autoprefixer_test from './projects/autoprefixer.eslint.config.mjs';
import main from '../src/index.js';

  test('autoprefixer', async () => {
    const result = await main(autoprefixer_test);
    expect(result).toMatchSnapshot('autoprefixer');
  });;

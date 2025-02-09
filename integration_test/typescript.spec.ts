import { expect, test } from 'vitest';
import typescript_test from './projects/typescript.eslint.config.mjs';
import main from '../src/index.js';

  test('typescript', async () => {
    const result = await main(typescript_test);
    expect(result).toMatchSnapshot('typescript');
  });;

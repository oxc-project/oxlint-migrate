import { describe, expect, test } from 'vitest';
import typescript_test from './projects/typescript.eslint.config.mjs';
import nuxt_auth_test from './projects/nuxt-auth.eslint.config.js';
import main from '../src/index.js';

describe('integration tests with github repositories', () => {
  test('typescript', async () => {
    const result = await main(typescript_test);
    expect(result).toMatchSnapshot('typescript');
  });

  test('nuxt-auth', async () => {
    console.log(nuxt_auth_test);
    const result = await main(nuxt_auth_test);
    expect(result).toMatchSnapshot('nuxt-auth');
  });
});

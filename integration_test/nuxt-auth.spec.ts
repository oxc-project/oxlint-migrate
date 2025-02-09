import { expect, test } from 'vitest';
import nuxt_auth_test from './projects/nuxt-auth.eslint.config.js';
import main from '../src/index.js';

test('nuxt-auth', async () => {
  const result = await main(nuxt_auth_test);
  expect(result).toMatchSnapshot('nuxt-auth');
});

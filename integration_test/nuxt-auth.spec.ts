import { expect, test } from 'vitest';
// @ts-ignore
import nuxt_auth_test from './projects/nuxt-auth.eslint.config.js';
import { getSnapshotResult } from './utils.js';

test('nuxt-auth', async () => {
  const result = await getSnapshotResult(nuxt_auth_test);
  expect(result).toMatchSnapshot('nuxt-auth');
});

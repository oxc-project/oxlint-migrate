import { expect, test } from 'vitest';
// @ts-ignore
import nuxt_auth_test from './projects/nuxt-auth.eslint.config.js';
import { getSnapshotResult, getSnapShotMergeResult } from './utils.js';

test('nuxt-auth', async () => {
  // https://github.com/antfu/eslint-config?tab=readme-ov-file#plugins-renaming
  const result = await getSnapshotResult(nuxt_auth_test);
  expect(result).toMatchSnapshot('nuxt-auth');
});

test('nuxt-auth --type-aware', async () => {
  // https://github.com/antfu/eslint-config?tab=readme-ov-file#plugins-renaming
  const result = await getSnapshotResult(nuxt_auth_test, undefined, {
    typeAware: true,
  });
  expect(result).toMatchSnapshot('nuxt-auth--type-aware');
});

test('nuxt-auth merge', async () => {
  const result = await getSnapShotMergeResult(nuxt_auth_test, {
    categories: {
      correctness: 'error',
      perf: 'error',
    },
  });
  expect(result).toMatchSnapshot('nuxt-auth--merge');
});

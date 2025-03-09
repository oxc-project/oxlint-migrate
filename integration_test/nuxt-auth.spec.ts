import { expect, test } from 'vitest';
// @ts-ignore
import nuxt_auth_test from './projects/nuxt-auth.eslint.config.js';
import { getSnapshotResult, getSnapShotUpgradeResult } from './utils.js';

test('nuxt-auth', async () => {
  // https://github.com/antfu/eslint-config?tab=readme-ov-file#plugins-renaming
  const result = await getSnapshotResult(
    nuxt_auth_test.renamePlugins({
      ts: '@typescript-eslint',
      test: 'vitest',
    })
  );
  expect(result).toMatchSnapshot('nuxt-auth');
});

test('nuxt-auth upgrade', async () => {
  const result = await getSnapShotUpgradeResult(
    nuxt_auth_test.renamePlugins({
      ts: '@typescript-eslint',
      test: 'vitest',
    }),
    {
      categories: {
        correctness: 'error',
        perf: 'error',
      },
    }
  );
  expect(result).toMatchSnapshot('nuxt-auth--upgrade');
});

import { expect, test } from 'vitest';
// @ts-ignore
import vuejs_core_test from './projects/vuejs-core.eslint.config.js';
import { getSnapshotResult, getSnapShotUpgradeResult } from './utils.js';

test('vuejs/core', async () => {
  const result = await getSnapshotResult(vuejs_core_test);
  expect(result).toMatchSnapshot('vuejs/core');
});

test('vuejs/core upgrade', async () => {
  const result = await getSnapShotUpgradeResult(vuejs_core_test, {
    categories: {
      correctness: 'error',
      perf: 'error',
    },
  });
  expect(result).toMatchSnapshot('vuejs/core--upgrade');
});

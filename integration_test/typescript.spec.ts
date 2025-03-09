import { expect, test } from 'vitest';
// @ts-ignore
import typescript_test from './projects/typescript.eslint.config.mjs';
import { getSnapshotResult, getSnapShotUpgradeResult } from './utils.js';

test('typescript', async () => {
  const result = await getSnapshotResult(typescript_test);
  expect(result).toMatchSnapshot('typescript');
});

test('typescript upgrade', async () => {
  const result = await getSnapShotUpgradeResult(typescript_test, {
    categories: {
      correctness: 'error',
      perf: 'error',
    },
  });
  expect(result).toMatchSnapshot('typescript--upgrade');
});

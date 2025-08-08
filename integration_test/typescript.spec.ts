import { expect, test } from 'vitest';
// @ts-ignore
import typescript_test from './projects/typescript.eslint.config.mjs';
import { getSnapshotResult, getSnapShotMergeResult } from './utils.js';

test('typescript', async () => {
  const result = await getSnapshotResult(typescript_test);
  expect(result).toMatchSnapshot('typescript');
});

test('typescript --type-aware', async () => {
  const result = await getSnapshotResult(typescript_test, undefined, {
    typeAware: true,
  });
  expect(result).toMatchSnapshot('typescript--type-aware');
});

test('typescript merge', async () => {
  const result = await getSnapShotMergeResult(typescript_test, {
    categories: {
      correctness: 'error',
      perf: 'error',
    },
  });
  expect(result).toMatchSnapshot('typescript--merge');
});

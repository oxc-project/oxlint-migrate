import { expect, test } from 'vitest';
// @ts-ignore
import autoprefixer_test from './projects/autoprefixer.eslint.config.mjs';
import { getSnapshotResult, getSnapShotMergeResult } from './utils.js';

test('autoprefixer', async () => {
  const result = await getSnapshotResult(autoprefixer_test);
  expect(result).toMatchSnapshot('autoprefixer');
});

test('autoprefixer merge', async () => {
  const result = await getSnapShotMergeResult(autoprefixer_test, {
    categories: {
      correctness: 'error',
      perf: 'error',
    },
  });
  expect(result).toMatchSnapshot('autoprefixer--merge');
});

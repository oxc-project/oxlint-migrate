import { expect, test } from 'vitest';
// @ts-ignore
import puppeteer_test from './projects/react-project.eslint.config.mjs';
import { getSnapshotResult, getSnapShotMergeResult } from './utils.js';

test('react-project', async () => {
  const result = await getSnapshotResult(puppeteer_test);
  expect(result).toMatchSnapshot('react-project');
});

test('react-project merge', async () => {
  const result = await getSnapShotMergeResult(puppeteer_test, {
    categories: {
      correctness: 'error',
      perf: 'error',
    },
  });
  expect(result).toMatchSnapshot('react-project--merge');
});

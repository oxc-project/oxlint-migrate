import { expect, test } from 'vitest';
// @ts-ignore
import puppeteer_test from './projects/puppeteer.eslint.config.mjs';
import { getSnapshotResult, getSnapShotUpgradeResult } from './utils.js';

test('puppeteer', async () => {
  const result = await getSnapshotResult(puppeteer_test);
  expect(result).toMatchSnapshot('puppeteer');
});

test('puppeteer upgrade', async () => {
  const result = await getSnapShotUpgradeResult(puppeteer_test, {
    categories: {
      correctness: 'error',
      perf: 'error',
    },
  });
  expect(result).toMatchSnapshot('puppeteer--upgrade');
});

import { expect, test } from 'vitest';
// @ts-ignore
import puppeteer_test from './projects/puppeteer.eslint.config.mjs';
import { getSnapshotResult } from './utils.js';

test('puppeteer', async () => {
  const result = await getSnapshotResult(puppeteer_test);
  expect(result).toMatchSnapshot('puppeteer');
});

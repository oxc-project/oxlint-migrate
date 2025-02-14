import { expect, test } from 'vitest';
// @ts-ignore
import autoprefixer_test from './projects/autoprefixer.eslint.config.mjs';
import { getSnapshotResult } from './utils.js';

test('autoprefixer', async () => {
  const result = await getSnapshotResult(autoprefixer_test);
  expect(result).toMatchSnapshot('autoprefixer');
});

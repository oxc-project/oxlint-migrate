import { expect, test } from 'vitest';
import typescript_test from './projects/typescript.eslint.config.mjs';
import { getSnapshotResult } from './utils.js';

test('typescript', async () => {
  const result = await getSnapshotResult(typescript_test);
  expect(result).toMatchSnapshot('typescript');
});

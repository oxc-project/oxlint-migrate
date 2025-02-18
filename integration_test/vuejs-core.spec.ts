import { expect, test } from 'vitest';
// @ts-ignore
import vuejs_core_test from './projects/vuejs-core.eslint.config.js';
import { getSnapshotResult } from './utils.js';

test('vuejs/core', async () => {
  const result = await getSnapshotResult(vuejs_core_test);
  expect(result).toMatchSnapshot('vuejs/core');
});

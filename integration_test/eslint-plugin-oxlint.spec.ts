import { expect, test } from 'vitest';
import eslint_plugin_oxlint_test from './projects/eslint-plugin-oxlint.eslint.config.js';
import { getSnapshotResult } from './utils.js';

test('eslint-plugin-oxlint', async () => {
  // @ts-ignore -- maybe bug in other plugin?
  const result = await getSnapshotResult(eslint_plugin_oxlint_test);
  expect(result).toMatchSnapshot('eslint-plugin-oxlint');
});

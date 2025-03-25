import { expect, test } from 'vitest';
import eslint_plugin_oxlint_test from './projects/eslint-plugin-oxlint.eslint.config.js';
import { getSnapshotResult, getSnapShotMergeResult } from './utils.js';

test('eslint-plugin-oxlint', async () => {
  // @ts-ignore -- maybe bug in other plugin?
  const result = await getSnapshotResult(eslint_plugin_oxlint_test);
  expect(result).toMatchSnapshot('eslint-plugin-oxlint');
});

test('eslint-plugin-oxlint merge', async () => {
  // original config
  // @ts-ignore -- maybe bug in other plugin?
  const result = await getSnapShotMergeResult(eslint_plugin_oxlint_test, {
    plugins: ['unicorn', 'typescript', 'oxc'],
    categories: {
      correctness: 'error',
      suspicious: 'error',
    },
  });
  expect(result).toMatchSnapshot('eslint-plugin-oxlint-merge');
});

import { expect, test } from 'vitest';
// @ts-ignore
import vscode_test from './projects/vscode.eslint.config.js';
import { getSnapshotResult, getSnapShotMergeResult } from './utils.js';

test('vscode', async () => {
  const result = await getSnapshotResult(vscode_test);
  expect(result).toMatchSnapshot('vscode');
});

test('vscode merge', async () => {
  const result = await getSnapShotMergeResult(vscode_test, {
    categories: {
      correctness: 'error',
      perf: 'error',
    },
  });
  expect(result).toMatchSnapshot('vscode--merge');
});

import { expect, test } from 'vitest';
// @ts-ignore
import vscode_test from './projects/vscode.eslint.config.js';
import { getSnapshotResult, getSnapShotUpgradeResult } from './utils.js';

test('vscode', async () => {
  const result = await getSnapshotResult(vscode_test);
  expect(result).toMatchSnapshot('vscode');
});

test('vscode upgrade', async () => {
  const result = await getSnapShotUpgradeResult(vscode_test, {
    categories: {
      correctness: 'error',
      perf: 'error',
    },
  });
  expect(result).toMatchSnapshot('vscode--upgrade');
});

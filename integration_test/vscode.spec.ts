import { expect, test } from 'vitest';
import vscode_test from './projects/vscode.eslint.config.js';
import { getSnapshotResult } from './utils.js';

test('vscode', async () => {
  const result = await getSnapshotResult(vscode_test);
  expect(result).toMatchSnapshot('vscode');
});

import { expect, test } from 'vitest';
import vscode_test from './projects/vscode.eslint.config.js';
import main from '../src/index.js';

test('vscode', async () => {
  const result = await main(vscode_test);
  expect(result).toMatchSnapshot('vscode');
});

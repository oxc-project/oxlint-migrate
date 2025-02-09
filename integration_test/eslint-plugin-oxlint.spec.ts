import { expect, test } from 'vitest';
import eslint_plugin_oxlint_test from './projects/eslint-plugin-oxlint.eslint.config.js';
import main from '../src/index.js';

test('eslint-plugin-oxlint', async () => {
  // @ts-ignore -- maybe bug in other plugin?
  const result = await main(eslint_plugin_oxlint_test);
  expect(result).toMatchSnapshot('eslint-plugin-oxlint');
});

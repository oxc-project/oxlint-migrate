import { expect, test } from 'vitest';
// @ts-ignore
import next_config_test from './projects/next-eslint-config-project.config.mjs';
import { getSnapshotResult, getSnapShotMergeResult } from './utils.js';

test('next-eslint-config-project', async () => {
  // https://github.com/antfu/eslint-config?tab=readme-ov-file#plugins-renaming
  const result = await getSnapshotResult(next_config_test);
  expect(result).toMatchSnapshot('next-eslint-config-project');
});

test('next-eslint-config-project --type-aware', async () => {
  // https://github.com/antfu/eslint-config?tab=readme-ov-file#plugins-renaming
  const result = await getSnapshotResult(next_config_test, undefined, {
    typeAware: true,
  });
  expect(result).toMatchSnapshot('next-eslint-config-project--type-aware');
});

test('next-eslint-config-project merge', async () => {
  const result = await getSnapShotMergeResult(next_config_test, {
    categories: {
      correctness: 'error',
      perf: 'error',
    },
  });
  expect(result).toMatchSnapshot('next-eslint-config-project--merge');
});

import { afterAll, beforeAll, expect, test } from 'vitest';
import { getSnapshotResult, getSnapShotMergeResult } from './utils.js';
import { preFixForJsPlugins } from '../src/js_plugin_fixes.js';

let reset: () => void;

beforeAll(async () => {
  reset = await preFixForJsPlugins();
});

afterAll(() => {
  reset();
});

test('next-eslint-config-project', async () => {
  const next_config_test = await import(
    // @ts-ignore
    './projects/next-eslint-config-project.config.mjs'
  );
  const result = await getSnapshotResult(next_config_test.default);
  expect(result).toMatchSnapshot('next-eslint-config-project');
});

test('next-eslint-config-project --type-aware', async () => {
  const next_config_test = await import(
    // @ts-ignore
    './projects/next-eslint-config-project.config.mjs'
  );
  const result = await getSnapshotResult(next_config_test.default, undefined, {
    typeAware: true,
  });
  expect(result).toMatchSnapshot('next-eslint-config-project--type-aware');
});

test('next-eslint-config-project merge', async () => {
  const next_config_test = await import(
    // @ts-ignore
    './projects/next-eslint-config-project.config.mjs'
  );
  const result = await getSnapShotMergeResult(next_config_test.default, {
    categories: {
      correctness: 'error',
      perf: 'error',
    },
  });
  expect(result).toMatchSnapshot('next-eslint-config-project--merge');
});

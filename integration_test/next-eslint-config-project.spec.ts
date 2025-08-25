import { afterAll, expect, test } from 'vitest';
import { getSnapshotResult, getSnapShotMergeResult } from './utils.js';

// Patch require to mock '@rushstack/eslint-patch/modern-module-resolution' before any imports
const Module = require('module');
const originalLoad = Module._load;
Module._load = function (request: any, _parent: any, _isMain: any) {
  if (
    request &&
    request.includes &&
    request.includes('@rushstack/eslint-patch')
  ) {
    // Return a harmless mock to avoid side effects
    return {};
  }
  return originalLoad.apply(this, arguments);
};

afterAll(() => {
  Module._load = originalLoad;
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

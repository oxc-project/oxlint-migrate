import { builtinModules } from 'node:module';
import { expect } from 'vitest';
// @ts-expect-error
import vuejs_core_test from './projects/vuejs-core.eslint.config.js';
import { testProject } from './utils.js';

// The config passes `builtinModules` straight into two rule options, so the migrated
// config echoes ~140 module names eight times over. That is most of this snapshot,
// it says nothing about the migration, and its contents change with the Node version
// the tests run on — `node:sqlite` and `node:test` are absent before Node 24, so the
// snapshot only matched on whichever Node last recorded it.
const nodeBuiltins = new Set([
  ...builtinModules,
  ...builtinModules.map((name) => `node:${name}`),
]);

expect.addSnapshotSerializer({
  test: (value) =>
    Array.isArray(value) &&
    value.length > 50 &&
    value.every((item) => typeof item === 'string' && nodeBuiltins.has(item)),
  // The count is left out on purpose: it is exactly what varies between Node
  // versions, which is the whole reason this serializer exists.
  print: () => '[<node builtins>]',
});

testProject('vuejs/core', vuejs_core_test);

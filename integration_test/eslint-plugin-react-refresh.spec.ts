import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import reactRefresh from 'eslint-plugin-react-refresh';
import { expect, test } from 'vitest';
import main from '../src/index.js';
import react_refresh_test from './projects/eslint-plugin-react-refresh.eslint.config.js';
import { testProject } from './utils.js';

testProject('eslint-plugin-react-refresh', react_refresh_test);
testProject('eslint-plugin-react-refresh Vite', reactRefresh.configs.vite);

test('Oxlint accepts the migrated Vite preset', async () => {
  expect(reactRefresh.configs.vite.rules).toHaveProperty(
    ['react-refresh/only-export-components'],
    ['error', { allowConstantExport: true, allowCompoundComponents: true }]
  );
  const config = await main(reactRefresh.configs.vite, undefined, {
    jsPlugins: true,
  });
  const directory = mkdtempSync(path.join(tmpdir(), 'oxlint-migrate-refresh-'));
  try {
    writeFileSync(
      path.join(directory, '.oxlintrc.json'),
      JSON.stringify(config)
    );
    writeFileSync(
      path.join(directory, 'App.jsx'),
      'export const App = () => <div />;\n'
    );
    const oxlint = fileURLToPath(
      new URL('bin/oxlint', import.meta.resolve('oxlint/package.json'))
    );
    execFileSync(process.execPath, [oxlint, 'App.jsx'], {
      cwd: directory,
      stdio: 'pipe',
    });
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

import { spawnSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import type { OxlintConfig } from '../src/types.js';

const require = createRequire(import.meta.url);

/** Path of the `oxlint` binary from the dev dependency. */
const oxlintBin = path.join(
  path.dirname(require.resolve('oxlint/package.json')),
  'bin/oxlint'
);

let checkCounter = 0;

export type OxlintRun = {
  /** True when oxlint read the config and loaded every plugin it lists. */
  ok: boolean;
  output: string;
};

/**
 * Runs the real `oxlint` against a generated config to check that it is loadable:
 * that every `jsPlugins` entry resolves, and that every rule belongs to a plugin
 * oxlint knows under that namespace.
 *
 * This is the only way to tell whether a migration produced a working config — the
 * mapping from ESLint plugin aliases to oxlint namespaces is decided by oxlint, not
 * by us, so asserting on our own output would only restate our assumptions.
 *
 * The config is written into `configDir` because oxlint resolves relative
 * `jsPlugins` specifiers against the directory of the config file, which is exactly
 * the directory the migration computed them for. Callers pass a `.temp` directory,
 * which the repository already ignores, so a crashed run leaves nothing behind that
 * `git status` would report.
 */
export const runOxlintWithConfig = (
  config: OxlintConfig,
  configDir: string
): OxlintRun => {
  // An empty file cannot produce a diagnostic, so a non-zero exit code can only come
  // from the config itself. The output is returned for the failure message but must
  // not be asserted on: oxlint prints a run summary whose wording and presence vary
  // between versions, even under `--silent`.
  const { status, output } = runOxlint(config, configDir, '', ['--silent']);
  return { ok: status === 0, output };
};

/**
 * Lints `source` with the given config and returns what oxlint reported.
 *
 * Where {@link runOxlintWithConfig} only proves a config loads, this shows which
 * rules it actually enables, and under which names.
 */
export const lintWithConfig = (
  config: OxlintConfig,
  configDir: string,
  source: string
): string => runOxlint(config, configDir, source, []).output;

const runOxlint = (
  config: OxlintConfig,
  configDir: string,
  source: string,
  extraArgs: string[]
): { status: number | null; output: string } => {
  mkdirSync(configDir, { recursive: true });
  const prefix = path.join(configDir, `check-${process.pid}-${checkCounter++}`);
  const configPath = `${prefix}.json`;
  const targetPath = `${prefix}.js`;

  try {
    writeFileSync(configPath, JSON.stringify(config, null, 2));
    writeFileSync(targetPath, source);

    const result = spawnSync(
      process.execPath,
      [oxlintBin, '--config', configPath, ...extraArgs, targetPath],
      { encoding: 'utf8' }
    );

    return {
      status: result.status,
      output: `${result.stdout ?? ''}${result.stderr ?? ''}`.trim(),
    };
  } finally {
    rmSync(configPath, { force: true });
    rmSync(targetPath, { force: true });
  }
};

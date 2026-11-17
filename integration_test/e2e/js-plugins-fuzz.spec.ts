import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { afterAll, describe, expect, test } from 'vitest';
import { loadESLintConfig } from '../../bin/config-loader.js';
import migrateConfig from '../../src/index.js';
import { deriveRulePrefix } from '../../src/jsPlugins.js';
import { DefaultReporter } from '../../src/reporter.js';
import type { OxlintConfig } from '../../src/types.js';
import { runOxlintWithConfig } from '../oxlint-runner.js';

/**
 * Randomised end-to-end check of the JS-plugin migration.
 *
 * Each round writes a small project with local and npm ESLint plugins wired up in a
 * random shape, migrates it the way the CLI does, and hands the result to the real
 * `oxlint`. oxlint decides what a valid `jsPlugins` entry and rule prefix are, so it
 * is the only oracle that can tell a working migration from a plausible-looking one.
 *
 * The seed is fixed so failures are reproducible; override it, and the number of
 * rounds, to search harder:
 *
 *   FUZZ_SEED=123 FUZZ_ROUNDS=200 pnpm test js-plugins-fuzz
 */
const SEED = Number(process.env.FUZZ_SEED ?? 20260906);
const ROUNDS = Number(process.env.FUZZ_ROUNDS ?? 12);

/** Deterministic PRNG, so a failing round can be replayed from its seed. */
const makeRandom = (seed: number) => {
  let state = seed >>> 0;
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    int: (max: number) => Math.floor(next() * max),
    pick: <T>(values: readonly T[]): T =>
      values[Math.floor(next() * values.length)],
    chance: (probability: number) => next() < probability,
  };
};

type Random = ReturnType<typeof makeRandom>;

/** npm plugins available as dev dependencies, with rules that really exist. */
const NPM_PLUGINS = [
  {
    specifier: 'eslint-plugin-regexp',
    rules: ['no-lazy-ends', 'no-empty-group'],
  },
  {
    specifier: 'eslint-plugin-mocha',
    rules: ['no-exclusive-tests', 'no-pending-tests'],
  },
  { specifier: 'eslint-plugin-tsdoc', rules: ['syntax'] },
  { specifier: '@stylistic/eslint-plugin', rules: ['indent', 'quotes'] },
] as const;

/**
 * Aliases a config may register a plugin under. `oxc` is deliberately in the list:
 * it is a namespace oxlint reserves for its own Rust plugins, so the migration has
 * to rename it rather than hand oxlint a config it rejects.
 */
const ALIASES = ['pluginA', 'my-plugin', '@scope/thing', 'oxc', 'zzz'] as const;

/** The `meta` an ESLint plugin may or may not describe itself with. */
const META_VARIANTS = [
  undefined,
  { name: 'eslint-plugin-fuzz-named' },
  { name: 'not-a-package-name' },
  { name: 'eslint-plugin-fuzz-scoped', namespace: 'fuzz-ns' },
] as const;

type LocalPlugin = { alias: string; file: string; rules: string[] };

const writeLocalPlugin = (
  projectDir: string,
  random: Random,
  index: number
): LocalPlugin => {
  const directory = random.pick(['.', 'plugins', 'plugins/deeper']);
  const file = `${directory}/local-${index}.js`;
  const absolute = path.join(projectDir, file);
  mkdirSync(path.dirname(absolute), { recursive: true });

  const rules = [`no-${index}-a`, `no-${index}-b`].slice(0, 1 + random.int(2));
  const meta = random.pick(META_VARIANTS);

  writeFileSync(
    absolute,
    `export default ${JSON.stringify(
      {
        ...(meta === undefined ? {} : { meta }),
        rules: Object.fromEntries(rules.map((rule) => [rule, '__RULE__'])),
      },
      null,
      2
    ).replaceAll('"__RULE__"', '{ create: () => ({}) }')};\n`
  );

  return { alias: `${random.pick(ALIASES)}-${index}`, file, rules };
};

const generateProject = (projectDir: string, random: Random): string => {
  mkdirSync(projectDir, { recursive: true });

  const locals = Array.from({ length: 1 + random.int(3) }, (_, index) =>
    writeLocalPlugin(projectDir, random, index)
  );
  const npm = NPM_PLUGINS.filter(() => random.chance(0.5));

  const imports: string[] = [];
  const registrations: string[] = [];
  const baseRules: string[] = [];
  const overrideRules: string[] = [];

  locals.forEach((local, index) => {
    imports.push(`import local${index} from './${local.file}';`);
    registrations.push(`${JSON.stringify(local.alias)}: local${index}`);
    for (const rule of local.rules) {
      const severity = random.pick(['"error"', '"warn"', '"off"']);
      const target = random.chance(0.3) ? overrideRules : baseRules;
      target.push(`${JSON.stringify(`${local.alias}/${rule}`)}: ${severity}`);
    }
  });

  npm.forEach((plugin, index) => {
    // Half the time the plugin keeps its conventional name, half the time it is
    // aliased, which is what forces an explicit `name` in the jsPlugins entry.
    const alias = random.chance(0.5)
      ? deriveRulePrefix(plugin.specifier)
      : `${random.pick(ALIASES)}-npm-${index}`;
    imports.push(
      `import npm${index} from ${JSON.stringify(plugin.specifier)};`
    );
    registrations.push(`${JSON.stringify(alias)}: npm${index}`);
    for (const rule of plugin.rules) {
      const severity = random.pick(['"error"', '"warn"']);
      baseRules.push(`${JSON.stringify(`${alias}/${rule}`)}: ${severity}`);
    }
  });

  const configPath = path.join(projectDir, 'eslint.config.mjs');
  writeFileSync(
    configPath,
    `${imports.join('\n')}

export default [
  {
    plugins: { ${registrations.join(', ')} },
    rules: { ${baseRules.join(', ')} },
  },
${
  overrideRules.length === 0
    ? ''
    : `  {
    files: ['**/*.spec.js'],
    rules: { ${overrideRules.join(', ')} },
  },
`
}];
`
  );

  return configPath;
};

const migrate = async (
  configPath: string,
  projectDir: string
): Promise<OxlintConfig> => {
  const { config, pluginSpecifiers } = await loadESLintConfig(configPath, {
    specifierBaseDir: projectDir,
  });

  return migrateConfig(config.default, undefined, {
    reporter: new DefaultReporter(),
    jsPlugins: true,
    jsPluginSpecifiers: pluginSpecifiers,
  });
};

/** Namespaces the config declares, across the root config and every override. */
const declaredNamespaces = (config: OxlintConfig): Set<string> => {
  const namespaces = new Set<string>();
  const collect = (section: { jsPlugins?: unknown; plugins?: unknown }) => {
    for (const entry of (section.jsPlugins ?? []) as (
      | string
      | { name: string }
    )[]) {
      namespaces.add(
        typeof entry === 'string' ? deriveRulePrefix(entry) : entry.name
      );
    }
    for (const plugin of (section.plugins ?? []) as string[]) {
      namespaces.add(plugin);
    }
  };

  collect(config);
  for (const override of config.overrides ?? []) {
    collect(override);
  }
  return namespaces;
};

// `integration_test/fixtures` is externalised in `vitest.config.ts`, so the
// generated projects are imported by Node itself and can be traced. Generating them
// inside the repository also means npm plugins resolve from its `node_modules`, and
// `.temp` is already in the repository's ignore list.
const rootDir = path.join(
  import.meta.dirname,
  `../fixtures/.temp/fuzz-${process.pid}`
);

afterAll(() => {
  rmSync(rootDir, { recursive: true, force: true });
});

describe('js plugin migration (fuzz)', () => {
  for (let round = 0; round < ROUNDS; round++) {
    const seed = SEED + round;

    test(`produces a config oxlint can load (seed ${seed})`, async () => {
      const projectDir = path.join(rootDir, `round-${round}`);
      const configPath = generateProject(projectDir, makeRandom(seed));

      const config = await migrate(configPath, projectDir);

      // Every rule has to point at a namespace the config declares, otherwise
      // oxlint refuses the whole config with "Plugin '...' not found".
      const namespaces = declaredNamespaces(config);
      const sections = [config, ...(config.overrides ?? [])];
      for (const section of sections) {
        for (const rule of Object.keys(section.rules ?? {})) {
          const slash = rule.lastIndexOf('/');
          if (slash !== -1) {
            expect(namespaces).toContain(rule.slice(0, slash));
          }
        }
      }

      const result = runOxlintWithConfig(config, projectDir);
      expect(
        result.ok,
        `oxlint rejected the migrated config:\n${result.output}\n\n${JSON.stringify(config, null, 2)}`
      ).toBe(true);
    });
  }
});

import type { Config } from './types.js';

type PossibleConfigs = Config | Config[] | Promise<Config> | Promise<Config[]>;

/**
 * @link https://github.com/antfu/eslint-config?tab=readme-ov-file#plugins-renaming
 */
const fixForAntfuEslintConfig = <T extends PossibleConfigs>(config: T): T => {
  if ('renamePlugins' in config && typeof config.renamePlugins === 'function') {
    return config.renamePlugins({
      ts: '@typescript-eslint',
      test: 'vitest',
      next: '@next/next',
      style: '@stylistic',
    });
  }

  return config;
};

/**
 * @link https://github.com/oxc-project/oxlint-migrate/issues/160
 */
const fixForNextEslintConfig = async (): Promise<() => void> => {
  // this fix can only be done in `Node.js` environment.
  // `module` does only exist there.
  if ('Deno' in globalThis || 'Bun' in globalThis) {
    return () => {};
  }

  type ModuleType = typeof import('module') & {
    // `_load` is Node.js's internal module loading function. We access this private API here
    // to intercept and mock the loading of '@rushstack/eslint-patch', preventing side effects
    // during ESLint config processing. This is necessary because there is no public API for this.
    _load: (request: string, ...args: unknown[]) => any;
  };
  const Module = await import('module');
  const mod = (Module.default || Module) as ModuleType;
  const originalLoad = mod._load;
  mod._load = function (request: string, ...args: unknown[]) {
    if (request && request.includes('@rushstack/eslint-patch')) {
      // Return a harmless mock to avoid side effects
      return {};
    }
    return originalLoad.apply(mod, [request, ...args]);
  };

  return () => {
    mod._load = originalLoad;
  };
};

export default function fixForJsPlugins(
  configs: PossibleConfigs
): PossibleConfigs {
  return fixForAntfuEslintConfig(configs);
}

export const preFixForJsPlugins = (): Promise<() => void> => {
  return fixForNextEslintConfig();
};

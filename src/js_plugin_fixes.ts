import type { Linter } from 'eslint';

type PossibleConfigs =
  | Linter.Config
  | Linter.Config[]
  | Promise<Linter.Config>
  | Promise<Linter.Config[]>;

/**
 * @link https://github.com/antfu/eslint-config?tab=readme-ov-file#plugins-renaming
 */
const fixForAntfuEslintConfig = <T extends PossibleConfigs>(config: T): T => {
  if ('renamePlugins' in config && typeof config.renamePlugins === 'function') {
    return config.renamePlugins({
      ts: '@typescript-eslint',
      test: 'vitest',
      next: '@next/next',
    });
  }

  return config;
};

/**
 * @link https://github.com/oxc-project/oxlint-migrate/issues/160
 */
const fixForNextEslintConfig = async (): Promise<() => void> => {
  // Patch require to mock '@rushstack/eslint-patch/modern-module-resolution' before any imports
  const Module = await import('module');
  const mod = Module.default || Module;
  const originalLoad = (mod as any)._load;
  (mod as any)._load = function (request: any, _parent: any, _isMain: any) {
    if (
      request &&
      request.includes &&
      request.includes('@rushstack/eslint-patch')
    ) {
      // Return a harmless mock to avoid side effects
      return {};
    }
    return originalLoad.apply(mod, arguments);
  };

  return () => {
    (mod as any)._load = originalLoad;
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

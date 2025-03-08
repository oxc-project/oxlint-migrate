import type { Linter } from 'eslint';
import { Options, OxlintConfigOrOverride } from './types.js';

export const transformIgnorePatterns = (
  eslintConfig: Linter.Config,
  targetConfig: OxlintConfigOrOverride,
  options?: Options
) => {
  if (eslintConfig.ignores === undefined) {
    return;
  }

  if ('files' in targetConfig) {
    options?.reporter !== undefined &&
      options.reporter('ignore list inside overrides is not supported');
    return;
  }

  if (targetConfig.ignorePatterns === undefined) {
    targetConfig.ignorePatterns = [];
  }

  targetConfig.ignorePatterns.push(...eslintConfig.ignores);

  // see https://github.com/oxc-project/oxc/issues/8842
  eslintConfig.ignores
    .filter((ignore) => ignore.startsWith('!'))
    .forEach(
      (ignore) =>
        options?.reporter !== undefined &&
        options.reporter(
          `ignore allow list is currently not supported: ${ignore}`
        )
    );
};

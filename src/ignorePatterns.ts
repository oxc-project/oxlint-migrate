import type { Linter } from 'eslint';
import { OxlintConfigOrOverride, Reporter } from './types.js';

export const transformIgnorePatterns = (
  eslintConfig: Linter.Config,
  targetConfig: OxlintConfigOrOverride,
  reporter: Reporter
) => {
  if (eslintConfig.ignores === undefined) {
    return;
  }

  if ('files' in targetConfig) {
    reporter !== undefined &&
      reporter('ignore list inside overrides is not supported');
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
        reporter !== undefined &&
        reporter(`ignore allow list is currently not supported: ${ignore}`)
    );
};

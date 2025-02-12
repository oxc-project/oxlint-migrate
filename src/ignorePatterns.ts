import type { Linter } from 'eslint';
import { OxlintConfigOrOverride } from './types.js';

export const transformIgnorePatterns = (
  eslintConfig: Linter.Config,
  targetConfig: OxlintConfigOrOverride,
  foundUnsupportedIgnore: string[]
) => {
  if (eslintConfig.ignores === undefined) {
    return;
  }

  if ('files' in targetConfig) {
    foundUnsupportedIgnore.push(
      'ignore list inside overrides is not supported'
    );
    return;
  }

  if (targetConfig.ignorePatterns === undefined) {
    targetConfig.ignorePatterns = [];
  }

  targetConfig.ignorePatterns.push(...eslintConfig.ignores);

  // see https://github.com/oxc-project/oxc/issues/8842
  foundUnsupportedIgnore.push(
    ...eslintConfig.ignores
      .filter((ignore) => ignore.startsWith('!'))
      .map(
        (ignore) => `ignore allow list is currently not supported: ${ignore}`
      )
  );
};

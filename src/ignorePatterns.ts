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
    options?.reporter?.report('ignore list inside overrides is not supported');
    return;
  }

  if (targetConfig.ignorePatterns === undefined) {
    targetConfig.ignorePatterns = [];
  }

  for (const ignores of eslintConfig.ignores) {
    if (!targetConfig.ignorePatterns.includes(ignores)) {
      targetConfig.ignorePatterns.push(ignores);
    }
  }
};

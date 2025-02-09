import type { Linter } from 'eslint';
import { OxlintConfig } from './types.js';

export const transformIgnorePatterns = (
  eslintConfig: Linter.Config,
  targetConfig: OxlintConfig,
  foundUnsupportedIgnore: string[]
) => {
  if (eslintConfig.ignores !== undefined) {
    targetConfig.ignorePatterns = eslintConfig.ignores;

    // see https://github.com/oxc-project/oxc/issues/8842
    foundUnsupportedIgnore.push(
      ...eslintConfig.ignores
        .filter((ignore) => ignore.startsWith('!'))
        .map(
          (ignore) => `ignore allow list is currently not supported: ${ignore}`
        )
    );
  }
};

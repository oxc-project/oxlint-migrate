import { OxlintConfig, OxlintConfigOverride } from './types.js';
import { isEqualDeep } from './utilities.js';

export const detectSameOverride = (
  config: OxlintConfig,
  override: OxlintConfigOverride
): [boolean, OxlintConfigOverride] => {
  if (config.overrides === undefined) {
    return [true, override];
  }

  // only when override has no categories to avoid merging rules which requires a plugin
  // plugins array will be later filled
  const matchedOverride = config.overrides.find(({ files, categories }) => {
    return categories === undefined && isEqualDeep(files, override.files);
  });

  if (matchedOverride !== undefined) {
    return [false, matchedOverride];
  }

  return [true, override];
};

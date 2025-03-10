import { OxlintConfig, OxlintConfigOverride } from './types.js';
import { isEqualDeep } from './utilities.js';

export const detectSameOverride = (
  config: OxlintConfig,
  override: OxlintConfigOverride
): [boolean, OxlintConfigOverride] => {
  if (config.overrides === undefined) {
    return [true, override];
  }

  // ToDo: check for plugins too
  const matchedOverride = config.overrides.find(({ files }) => {
    // console.log(files, override.files)
    return isEqualDeep(files, override.files);
  });

  if (matchedOverride !== undefined) {
    return [false, matchedOverride];
  }

  return [true, override];
};

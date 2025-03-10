import { OxlintConfig, OxlintConfigOverride } from './types.js';
import { isEqualDeep } from './utilities.js';

export const detectSameOverride = (
  config: OxlintConfig,
  override: OxlintConfigOverride
): OxlintConfigOverride => {
  if (config.overrides === undefined) {
    config.overrides = [override];
    return override;
  }

  // ToDo: check for plugins too
  const matchedOverride = config.overrides?.find(({ files }) =>
    isEqualDeep(files, override.files)
  );

  if (matchedOverride !== undefined) {
    return matchedOverride;
  }

  config.overrides.push(override);

  return override;
};

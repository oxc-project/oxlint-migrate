import { ES_VERSIONS } from './env_globals.js';
import { OxlintConfig, OxlintConfigOverride } from './types.js';

export const cleanUpOxlintConfig = (
  config: OxlintConfig | OxlintConfigOverride
): void => {
  // no entries in globals, we can remove the globals key
  if (
    config.globals !== undefined &&
    Object.keys(config.globals).length === 0
  ) {
    delete config.globals;
  }

  if (config.env !== undefined) {
    // these are not supported by oxlint
    delete config.env.es3;
    delete config.env.es5;
    delete config.env.es2015;

    let detected = false;
    // remove older es versions,
    // because newer ones are always a superset of them
    for (const esVersion of ES_VERSIONS.reverse()) {
      if (detected) {
        delete config.env[`es${esVersion}`];
      } else if (config.env[`es${esVersion}`] === true) {
        detected = true;
      }
    }
  }

  if (config.rules !== undefined && Object.keys(config.rules).length === 0) {
    delete config.rules;
  }

  // the only key left is
  if (Object.keys(config).length === 1 && 'files' in config) {
    // @ts-ignore -- what?
    delete config.files;
  }
};

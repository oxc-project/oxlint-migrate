import {
  cleanUpSupersetEnvs,
  cleanUpUselessOverridesEnv,
  ES_VERSIONS,
  removeGlobalsWithAreCoveredByEnv,
  transformBoolGlobalToString,
} from './env_globals.js';
import {
  cleanUpDisabledRootRules,
  cleanUpRulesWhichAreCoveredByCategory,
  cleanUpUselessOverridesPlugins,
  cleanUpUselessOverridesRules,
  replaceNodePluginName,
  replaceTypescriptAliasRules,
} from './plugins_rules.js';
import {
  OxlintConfigOrOverride,
  OxlintConfig,
  OxlintConfigOverride,
} from './types.js';
import { isEqualDeep } from './utilities.js';

const TS_ESLINT_DEFAULT_OVERRIDE: OxlintConfigOverride = {
  files: ['**/*.ts', '**/*.tsx', '**/*.mts', '**/*.cts'],
  rules: {
    'no-class-assign': 'off',
    'no-const-assign': 'off',
    'no-dupe-class-members': 'off',
    'no-dupe-keys': 'off',
    'no-func-assign': 'off',
    'no-import-assign': 'off',
    'no-new-native-nonconstructor': 'off',
    'no-obj-calls': 'off',
    'no-redeclare': 'off',
    'no-setter-return': 'off',
    'no-this-before-super': 'off',
    'no-unsafe-negation': 'off',
    'no-var': 'error',
    'prefer-rest-params': 'error',
    'prefer-spread': 'error',
  },
};

const cleanUpDefaultTypeScriptOverridesForEslint = (
  config: OxlintConfig
): void => {
  if (config.overrides === undefined) {
    return;
  }

  for (const [index, override] of config.overrides.entries()) {
    if (isEqualDeep(override, TS_ESLINT_DEFAULT_OVERRIDE)) {
      delete config.overrides[index];
    }
  }

  config.overrides = config.overrides.filter(
    (overrides) => Object.keys(overrides).length > 0
  );

  if (Object.keys(config.overrides).length === 0) {
    delete config.overrides;
  }
};

const cleanUpUselessOverridesEntries = (config: OxlintConfig): void => {
  cleanUpDefaultTypeScriptOverridesForEslint(config);
  cleanUpUselessOverridesRules(config);
  cleanUpUselessOverridesPlugins(config);
  cleanUpUselessOverridesEnv(config);
  cleanUpSupersetEnvs(config);

  if (config.overrides === undefined) {
    return;
  }

  for (const [overrideIndex, override] of config.overrides.entries()) {
    // If there's only one key left, it can be deleted. An override needs files+plugins or files+rules to make sense.
    if (Object.keys(override).length === 1) {
      delete config.overrides[overrideIndex];
    }
  }

  config.overrides = config.overrides.filter(
    (overrides) => Object.keys(overrides).length > 0
  );

  // Merge consecutive identical overrides to avoid redundancy
  mergeConsecutiveOverrides(config);

  if (config.overrides.length === 0) {
    delete config.overrides;
  }
};

export const cleanUpOxlintConfig = (config: OxlintConfigOrOverride): void => {
  removeGlobalsWithAreCoveredByEnv(config);
  transformBoolGlobalToString(config);
  replaceTypescriptAliasRules(config);
  replaceNodePluginName(config);
  cleanUpRulesWhichAreCoveredByCategory(config);

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
    for (const esVersion of [...ES_VERSIONS].reverse()) {
      if (detected) {
        delete config.env[`es${esVersion}`];
      } else if (config.env[`es${esVersion}`] === true) {
        detected = true;
      }
    }
  }

  if (!('files' in config)) {
    cleanUpUselessOverridesEntries(config);
    cleanUpDisabledRootRules(config);
  }
};

function mergeConsecutiveOverrides(config: OxlintConfig) {
  mergeConsecutiveIdenticalOverrides(config);
  mergeConsecutiveOverridesWithDifferingFiles(config);
}

/**
 * Merges consecutive identical overrides in the config's overrides array
 * Merges only if the overrides are directly next to each other
 * (otherwise they could be overriden in between one another).
 *
 * Example:
 *
 * ```json
 * overrides: [
 *   {
 *     "files": [
 *       "*.ts",
 *       "*.tsx",
 *     ],
 *     "plugins": [
 *       "typescript",
 *     ],
 *   },
 *    {
 *      "files": [
 *        "*.ts",
 *        "*.tsx",
 *      ],
 *      "plugins": [
 *        "typescript",
 *      ],
 *    },
 * ]
 * ```
 */
function mergeConsecutiveIdenticalOverrides(config: OxlintConfig) {
  if (config.overrides !== undefined && config.overrides.length > 1) {
    const mergedOverrides: OxlintConfigOverride[] = [];
    let i = 0;

    while (i < config.overrides.length) {
      const current = config.overrides[i];

      // Check if the next override is identical to the current one
      if (
        i + 1 < config.overrides.length &&
        isEqualDeep(current, config.overrides[i + 1])
      ) {
        // Skip duplicates - just add the first one
        mergedOverrides.push(current);
        // Skip all consecutive duplicates
        while (
          i + 1 < config.overrides.length &&
          isEqualDeep(current, config.overrides[i + 1])
        ) {
          i++;
        }
      } else {
        mergedOverrides.push(current);
      }

      i++;
    }

    config.overrides = mergedOverrides;
  }
}

/**
 * Merge consecutive overrides that have differing files but everything else is identical.
 *
 * ```json
 * "overrides": [
 *   {
 *     "files": [
 *       "*.ts",
 *     ],
 *     "rules": {
 *       "arrow-body-style": "error",
 *     },
 *   },
 *   {
 *     "files": [
 *       "*.mts",
 *       "*.cts",
 *     ],
 *     "rules": {
 *       "arrow-body-style": "error",
 *     },
 *   },
 * ],
 * ```
 */
function mergeConsecutiveOverridesWithDifferingFiles(config: OxlintConfig) {
  if (config.overrides !== undefined && config.overrides.length > 1) {
    const mergedOverrides: OxlintConfigOverride[] = [];
    let i = 0;

    while (i < config.overrides.length) {
      const current = config.overrides[i];
      const currentFiles = current.files;
      const { files: _, ...currentWithoutFiles } = current;

      // Look ahead to find consecutive overrides with same properties (except files)
      let j = i + 1;
      const filesToMerge: string[] = Array.isArray(currentFiles)
        ? [...currentFiles]
        : currentFiles
          ? [currentFiles]
          : [];

      while (j < config.overrides.length) {
        const next = config.overrides[j];
        const { files: __, ...nextWithoutFiles } = next;

        // Check if everything except files is identical
        if (isEqualDeep(currentWithoutFiles, nextWithoutFiles)) {
          // Merge the files
          if (Array.isArray(next.files)) {
            filesToMerge.push(...next.files);
          } else if (next.files) {
            filesToMerge.push(next.files);
          }
          j++;
        } else {
          break;
        }
      }

      // Create the merged override
      if (j > i + 1) {
        // We found overrides to merge
        // Deduplicate the files array
        const uniqueFiles = [...new Set(filesToMerge)];
        mergedOverrides.push({
          ...current,
          files: uniqueFiles,
        });
        i = j;
      } else {
        // No merge, keep as is
        mergedOverrides.push(current);
        i++;
      }
    }

    config.overrides = mergedOverrides;
  }
}

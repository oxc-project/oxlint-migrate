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
  mergeConsecutiveIdenticalOverrides(config);
  mergeConsecutiveOverridesWithDifferingFiles(config);

  // Merge overrides which have identical files arrays (must be consecutive).
  mergeOverridesByFiles(config);

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
  if (config.overrides === undefined) {
    return;
  }
  if (config.overrides.length <= 1) {
    return;
  }

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
  if (config.overrides === undefined) {
    return;
  }
  if (config.overrides.length <= 1) {
    return;
  }

  const mergedOverrides: OxlintConfigOverride[] = [];
  let i = 0;

  while (i < config.overrides.length) {
    const current = config.overrides[i];
    const currentFiles = current.files;
    const { files: _, ...currentWithoutFiles } = current;

    // Look ahead to find consecutive overrides with same properties (except files)
    let j = i + 1;
    const filesToMerge: string[] = [...currentFiles];

    while (j < config.overrides.length) {
      const next = config.overrides[j];
      const { files: __, ...nextWithoutFiles } = next;

      // Check if everything except files is identical
      if (isEqualDeep(currentWithoutFiles, nextWithoutFiles)) {
        // Merge the files
        filesToMerge.push(...next.files);
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

/**
 * Merge overrides that have identical files arrays, even if they are not consecutive.
 * This will merge rules, plugins and other keys from later occurrences into the
 * first occurrence and clear them on duplicates so later cleanup deletes them.
 */
export function mergeOverridesByFiles(config: OxlintConfig) {
  if (config.overrides === undefined) {
    return;
  }

  const groups = new Map<string, number[]>();

  for (const [i, override] of config.overrides.entries()) {
    if (override.files === undefined) {
      continue;
    }

    const key = JSON.stringify(override.files);
    const arr = groups.get(key) ?? [];
    arr.push(i);
    groups.set(key, arr);
  }

  for (const indices of groups.values()) {
    if (indices.length <= 1) continue;

    // Only merge indices that form consecutive runs. Non-consecutive duplicates
    // are not merged because intervening overrides might change behavior.
    indices.sort((a, b) => a - b);
    let runStart = indices[0];
    let runPrev = runStart;

    const flushRun = (start: number, end: number) => {
      const firstIndex = start;
      const first = config.overrides![firstIndex];
      for (let k = start + 1; k <= end; k++) {
        const other = config.overrides![k];

        // Merge rules with last-wins (later overrides take precedence)
        if (other.rules) {
          if (!first.rules) first.rules = {};
          Object.assign(first.rules, other.rules);
        }

        // Merge plugins as a set
        if (other.plugins) {
          if (!first.plugins) first.plugins = [];
          first.plugins = [...new Set([...first.plugins, ...other.plugins])];
        }

        // Merge simple objects like env and globals by shallow merge
        for (const key of ['env', 'globals'] as const) {
          if ((other as any)[key]) {
            if (!(first as any)[key]) {
              (first as any)[key] = (other as any)[key];
            } else {
              (first as any)[key] = {
                ...(first as any)[key],
                ...(other as any)[key],
              };
            }
          }
        }

        // Clear merged keys on the duplicate so it can be removed later
        for (const prop of Object.keys(other)) {
          // Only delete keys that were merged
          if (['rules', 'plugins', 'env', 'globals'].includes(prop)) {
            delete (other as any)[prop];
          }
        }
      }
    };

    for (let idxi = 1; idxi < indices.length; idxi++) {
      const idx = indices[idxi];
      if (idx === runPrev + 1) {
        // extend run
        runPrev = idx;
      } else {
        // flush previous run if it had >1 item
        if (runPrev > runStart) {
          flushRun(runStart, runPrev);
        }
        runStart = idx;
        runPrev = idx;
      }
    }

    // flush last run
    if (runPrev > runStart) {
      flushRun(runStart, runPrev);
    }
  }
}

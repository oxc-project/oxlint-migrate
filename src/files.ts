import type { Reporter } from './types.js';

/**
 * Process ESLint config files field, separating simple string patterns
 * from nested arrays (AND glob patterns which are unsupported in oxlint).
 *
 * @param files - The files field from ESLint config (can be string, array of strings, or array with nested arrays)
 * @param reporter - Optional reporter to report unsupported AND patterns and non-string matchers
 * @returns Array of simple string patterns (valid files)
 */
export function processConfigFiles(
  files: unknown,
  reporter?: Reporter
): string[] {
  // Normalize files to an array
  const filesArray = Array.isArray(files) ? files : [files];

  // Separate nested arrays (AND patterns) from simple strings
  const simpleFiles: string[] = [];

  for (const file of filesArray) {
    if (Array.isArray(file)) {
      const filesSet = new Set<unknown>(file);
      if (filesSet.size === 0) {
        // skip empty nested arrays
        continue;
      }

      if (filesSet.size > 1) {
        // Report if there are multiple patterns in the nested array (AND pattern)
        reporter?.addWarning(
          `ESLint AND glob patterns (nested arrays in files) are not supported in oxlint: ${JSON.stringify(file)}`
        );
        continue;
      }

      if (typeof file[0] === 'string') {
        simpleFiles.push(file[0]);
      } else {
        reporter?.addWarning(
          'ESLint function matchers in files are not supported in oxlint'
        );
      }
    } else if (typeof file === 'string') {
      simpleFiles.push(file);
    } else {
      reporter?.addWarning(
        'ESLint function matchers in files are not supported in oxlint'
      );
    }
  }

  return simpleFiles;
}

import type { Linter } from 'eslint';
import type { Reporter } from './types.js';

export type ProcessFilesResult = {
  /**
   * Simple string patterns that can be used directly
   */
  validFiles: string[];
  /**
   * Whether all files were nested arrays (AND patterns)
   */
  shouldSkip: boolean;
};

/**
 * Process ESLint config files field, separating simple string patterns
 * from nested arrays (AND glob patterns which are unsupported in oxlint).
 *
 * @param files - The files field from ESLint config (can be string, array of strings, or array with nested arrays)
 * @param reporter - Optional reporter to report unsupported AND patterns
 * @returns Object with validFiles array and shouldSkip flag
 */
export function processConfigFiles(
  files: Linter.Config['files'],
  reporter?: Reporter
): ProcessFilesResult {
  if (files === undefined) {
    return { validFiles: [], shouldSkip: false };
  }

  // Normalize files to an array
  const filesArray = Array.isArray(files) ? files : [files];

  // Separate nested arrays (AND patterns) from simple strings
  const simpleFiles: string[] = [];
  const nestedArrays: string[][] = [];

  for (const file of filesArray) {
    if (Array.isArray(file)) {
      nestedArrays.push(file);
    } else {
      simpleFiles.push(file);
    }
  }

  // Report nested arrays (AND glob patterns) as unsupported
  if (nestedArrays.length > 0) {
    reporter?.report(
      `ESLint AND glob patterns (nested arrays in files) are not supported in oxlint: ${JSON.stringify(nestedArrays)}`
    );
  }

  // If no valid files remain after filtering nested arrays, signal to skip this config
  return {
    validFiles: simpleFiles,
    shouldSkip: simpleFiles.length === 0,
  };
}

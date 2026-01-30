import { existsSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

// @link <https://github.com/eslint/eslint/blob/5fd211d00b6f0fc58cf587196a432325b7b88ec2/lib/config/config-loader.js#L40-L47>
const FLAT_CONFIG_FILENAMES = [
  'eslint.config.js',
  'eslint.config.mjs',
  'eslint.config.cjs',
  'eslint.config.ts',
  'eslint.config.mts',
  'eslint.config.cts',
];

export const getAutodetectedEslintConfigName = (
  cwd: string
): string | undefined => {
  for (const filename of FLAT_CONFIG_FILENAMES) {
    const filePath = path.join(cwd, filename);
    if (existsSync(filePath)) {
      return filePath;
    }
  }
};

const getNodeVersion = (): string => {
  return process.versions.node;
};

const isNodeVersionSupported = (minVersion: string): boolean => {
  const currentVersion = getNodeVersion();
  const [currentMajor, currentMinor, currentPatch] = currentVersion
    .split('.')
    .map(Number);
  const [minMajor, minMinor, minPatch] = minVersion.split('.').map(Number);

  if (currentMajor > minMajor) return true;
  if (currentMajor < minMajor) return false;
  if (currentMinor > minMinor) return true;
  if (currentMinor < minMinor) return false;
  return currentPatch >= minPatch;
};

export const loadESLintConfig = async (filePath: string): Promise<any> => {
  // report when json file is found
  if (filePath.endsWith('json')) {
    throw new Error(
      `json format is not supported. @oxlint/migrate only supports the eslint flat configuration`
    );
  }

  // windows allows only file:// prefix to be imported, reported Error:
  // Only URLs with a scheme in: file, data, and node are supported by the default ESM loader. On Windows, absolute paths must be valid file:// URLs. Received protocol 'c:'
  let url = pathToFileURL(filePath).toString();

  // report when file does not exists
  if (!existsSync(filePath)) {
    throw new Error(`eslint config file not found: ${filePath}`);
  }

  // Bun and Deno supports TS import natively, only Node needs a custom loader
  if ('Bun' in globalThis || 'Deno' in globalThis) {
    return import(url);
  }

  // Check if TypeScript config file and Node version
  if (
    filePath.endsWith('.ts') ||
    filePath.endsWith('.mts') ||
    filePath.endsWith('.cts')
  ) {
    // Node.js >=22.18.0 supports type-stripping natively
    if (!isNodeVersionSupported('22.18.0')) {
      const currentVersion = getNodeVersion();
      throw new Error(
        `TypeScript ESLint config files require Node.js >=22.18.0 (current version: ${currentVersion}). ` +
          `Please upgrade Node.js or use a JavaScript config file (.js, .mjs, .cjs) instead.`
      );
    }

    // Use native import with --experimental-strip-types (enabled by default in >=22.18.0)
    return import(url);
  }

  // for .js, .mjs, .cjs files we can use the native import
  return import(url);
};

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

  // Bun and Deno supports TS import natively, Node with `--experimental-strip-types`, which is enabled by default in version >=22.18.0
  // see: https://nodejs.org/en/learn/typescript/run-natively
  if ('Bun' in globalThis || 'Deno' in globalThis) {
    return import(url);
  }

  // For Node.js with TypeScript files:
  // - Node.js >=22.18.0: type-stripping is enabled by default
  // - Node.js >=22.6.0: use NODE_OPTIONS=--experimental-strip-types
  // - Node.js <22.6.0: use NODE_OPTIONS=--import @oxc-node/core/register (requires @oxc-node/core as dev dependency)
  // If none of the above are configured, Node.js will throw an error when trying to import the TypeScript file
  return import(url);
};

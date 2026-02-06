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

  // TypeScript files are supported in the following environments:
  // - Bun and Deno: TypeScript is natively supported
  // - Node.js >=22.18.0: type-stripping is enabled by default
  // - Node.js >=22.6.0: use NODE_OPTIONS=--experimental-strip-types
  // - Node.js <22.6.0: use NODE_OPTIONS=--import @oxc-node/core/register (requires @oxc-node/core as dev dependency)
  // See: https://nodejs.org/en/learn/typescript/run-natively
  // If the environment is not properly configured, the runtime will throw an error when trying to import the TypeScript file
  return import(url);
};

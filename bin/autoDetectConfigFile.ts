import { existsSync } from 'fs';
import path from 'node:path';

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

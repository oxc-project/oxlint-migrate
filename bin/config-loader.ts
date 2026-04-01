import { existsSync } from 'node:fs';
import { registerHooks } from 'node:module';
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

export interface UrlAndSpecifiers {
  url: string;
  specifiers: Set<string>;
}

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

export const loadESLintConfig = async (
  filePath: string
): Promise<[any, Map<unknown, UrlAndSpecifiers[]>]> => {
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

  const resolved = new Map<string, Set<string>>();
  const registeredHooks = registerHooks({
    resolve: (specifier, context, nextResolve) => {
      const output = nextResolve(specifier, context);
      const specifiers = resolved.get(output.url);
      if (specifiers) {
        specifiers.add(specifier);
      } else {
        resolved.set(output.url, new Set([specifier]));
      }
      return output;
    },
  });

  // TypeScript files are supported in the following environments:
  // - Bun and Deno: TypeScript is natively supported
  // - Node.js >=22.18.0: type-stripping is enabled by default
  // - Node.js >=22.6.0: use NODE_OPTIONS=--experimental-strip-types
  // - Node.js <22.6.0: use NODE_OPTIONS=--import @oxc-node/core/register (requires @oxc-node/core as dev dependency)
  // See: https://nodejs.org/en/learn/typescript/run-natively
  // If the environment is not properly configured, the runtime will throw an error when trying to import the TypeScript file
  const config = await import(url);

  registeredHooks.deregister();

  const modules = new Map<unknown, UrlAndSpecifiers[]>();
  const loadedModules = await Promise.all(
    resolved.entries().map(([url, specifiers]) =>
      import(url)
        // TODO: We should probaly filter import that doesn't seem to be eslint plugins
        .then((module) => [module.default, { url, specifiers }] as const)
        .catch(() => undefined)
    )
  );
  for (const loadedModule of loadedModules) {
    if (!loadedModule) continue;
    const [defaultExport, record] = loadedModule;
    const records = modules.get(defaultExport);
    if (records) {
      records.push(record);
    } else {
      modules.set(defaultExport, [record]);
    }
  }

  return [config, modules];
};

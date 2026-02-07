# @oxlint/migrate

![test](https://github.com/oxc-project/oxlint-migrate/actions/workflows/test.yml/badge.svg)
[![NPM Version](https://img.shields.io/npm/v/%40oxlint%2Fmigrate)](https://www.npmjs.com/package/@oxlint/migrate)
[![NPM Downloads](https://img.shields.io/npm/dm/%40oxlint%2Fmigrate)](https://www.npmjs.com/package/@oxlint/migrate)

Generates a `.oxlintrc.json` from an existing ESLint flat config.

See [the Migration Guide in the Oxlint docs](https://oxc.rs/docs/guide/usage/linter/migrate-from-eslint.html) for more information on migrating from ESLint to Oxlint.

## Usage

```shell
npx @oxlint/migrate <optional-eslint-flat-config-path>
```

When no config file is provided, the script searches for the default ESLint config filenames in the current directory.

### Options

| Options                     | Description                                                                                                                                 |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `--merge`                   | \* merge ESLint configuration with an existing .oxlintrc.json configuration                                                                 |
| `--type-aware`              | Include type aware rules, which are supported with `oxlint --type-aware` and [oxlint-tsgolint](https://github.com/oxc-project/tsgolint)     |
| `--with-nursery`            | Include oxlint rules which are currently under development                                                                                  |
| `--js-plugins`              | \*\* Include ESLint plugins via `jsPlugins` key.                                                                                            |
| `--details`                 | List rules that could not be migrated to oxlint                                                                                             |
| `--output-file <file>`      | The oxlint configuration file where ESLint v9 rules will be written to, default: `.oxlintrc.json`                                           |
| `--replace-eslint-comments` | Search in the project files for ESLint comments and replaces them with oxlint. Some ESLint comments are not supported and will be reported. |

\* WARNING: When some `categories` are enabled, this tools will enable more rules with the combination of `plugins`.
Else we need to disable each rule `plugin/categories` combination, which is not covered by your ESLint configuration.
This behavior can change in the future.

\*\* WARNING: Tries to guess the plugin name. Should work fine with most plugin names, but is not perfect.
Not every ESLint API is integrated with `oxlint`.
Tested ESLint Plugins with `oxlint` can be found in this [Oxc Discussion](https://github.com/oxc-project/oxc/discussions/14862). See the caveats section for more details.

### User Flow

- Upgrade `oxlint` and `@oxlint/migrate` to the same version.
- Execute `npx @oxlint/migrate`
- (Optional): Disable supported rules via [eslint-plugin-oxlint](https://github.com/oxc-project/eslint-plugin-oxlint), if you have any rules you need that aren't in Oxlint yet.

### TypeScript ESLint Configuration Files

TypeScript configuration files, like `eslint.config.mts`, are supported in the following environments:

- **Deno and Bun**: TypeScript configuration files are natively supported.
- **Node.js >=22.18.0**: TypeScript configuration files are supported natively with built-in type-stripping enabled by default.
- **Node.js >=22.6.0**: TypeScript configuration files can be used by setting `NODE_OPTIONS=--experimental-strip-types`.
- **Node.js <22.6.0**: TypeScript configuration files can be used by setting `NODE_OPTIONS=--import @oxc-node/core/register` and installing [@oxc-node/core](https://www.npmjs.com/package/@oxc-node/core) as a dev dependency.

If you attempt to use a TypeScript configuration file without the proper setup for your Node.js version, Node.js will throw an error when trying to import the file.

## Contributing

### Generate rules

Generates the rules from installed oxlint version

```shell
pnpm generate
pnpm format
```

### Unit + Integration Test

```shell
pnpm vitest
```

### Manual Testing

```shell
pnpm manual-test
```

## Caveats

The migration tool has been tested to work quite well for simple ESLint flat config files. It has also been tested to work correctly for the large majority of complex flat config files. However, there may be some edge cases where the migration is not perfect, or the behavior of Oxlint itself differs from ESLint.

Here are some known caveats to be aware of:

**`settings` field migration**

The `settings` field (e.g. for setting the React version) is migrated for known oxlint-supported plugins: `jsx-a11y`, `next`, `react`, `jsdoc`, and `vitest`. By default, other settings keys are skipped since they aren't supported by oxlint. If using the `--js-plugins` flag, other settings keys will also be migrated in order to support JS Plugins.

Note: Oxlint does not support `settings` in override configs. If your ESLint config has settings in configs with `files` patterns, those settings will be skipped and a warning will be shown.

Not all `settings` options are supported by oxlint, and so rule behavior in certain edge-cases may differ. See [the Settings docs](https://oxc.rs/docs/guide/usage/linter/config-file-reference.html#settings) for more info.

**Local ESLint Plugins imported via path are not migrated**

The `--js-plugins` flag cannot migrate ESLint plugins from file paths in the same repo currently (e.g. if you have `../eslint-plugin-myplugin` in your `eslint.config.mjs`). You will need to copy them over into the `jsPlugins` manually. See [the JS Plugins docs]() for more info.

**`globals` field with large number of values**

If you end up with a very large list of values for the `globals` field, it's likely because your version of the `globals` npm package is older (or newer!) than the one used in `@oxlint/migrate`.

You can generally fix this by updating the `globals` package to the latest version so we can recognize the relevant globals and handle it as a simple `env` field.

For example, this is a good `.oxlintrc.json` and means the globals used by your ESLint config were recognized:

```jsonc
{
  "env": {
    "browser": true,
  },
}
```

And this is bad:

```jsonc
{
  "globals": {
    "window": "readonly",
    "document": "readonly",
    "navigator": "readonly",
    // ...and a few hundred more
  },
}
```

**Oxlint can potentially lint more files by default**

If you extend certain ESLint configs (e.g. the airbnb config), they can disable many - or even all - rules for specific files or file types. And this is not always obvious to the end-user.

Depending on how this is implemented by the given config, these behaviors may not migrate to your Oxlint config. If you see certain files that you do not want to run Oxlint on which the migrator did not handle, you can add the relevant patterns to the `ignorePatterns` field in `.oxlintrc.json`.

**Not all ESLint plugins will work with JS Plugins**

The JS Plugins API supports almost all ESLint v9+ plugins for linting JS/TS/JSX/TSX files, but there are still some minor holes in support. See the [JS Plugins documentation](https://oxc.rs/docs/guide/usage/linter/js-plugins.html) for specifics.

For example, if you currently use `eslint-plugin-prettier`, it will not work as a JS Plugin, as we do not support custom parsers for JS Plugins. To replace the functionality of `eslint-plugin-prettier`, you can use `prettier --check` in CI and/or your git pre-commit hooks to ensure code formatting is enforced.

You could also consider [replacing Prettier with Oxfmt](https://oxc.rs/docs/guide/usage/formatter/migrate-from-prettier.html).

Note that `eslint-config-prettier` is different from the prettier plugin, and _will_ be migrated fine, as it's just a config to disable formatting-related ESLint rules, not an actual plugin.

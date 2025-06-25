# @oxlint/migrate

![test](https://github.com/oxc-project/oxlint-migrate/actions/workflows/test.yml/badge.svg)
[![NPM Version](https://img.shields.io/npm/v/%40oxlint%2Fmigrate)](https://www.npmjs.com/package/@oxlint/migrate)
[![NPM Downloads](https://img.shields.io/npm/dm/%40oxlint%2Fmigrate)](https://www.npmjs.com/package/@oxlint/migrate)

Generates a `.oxlintrc.json` from a existing eslint flat config.

## Usage

```shell
npx @oxlint/migrate <optional-eslint-flat-config-path>
```

When no config file provided, the script searches for the default eslint config filenames in the current directory.

### Options

| Options                | Description                                                                                          |
| ---------------------- | ---------------------------------------------------------------------------------------------------- |
| `--merge`              | \* merge eslint configuration with an existing .oxlintrc.json configuration                          |
| `--with-nursery`       | Include oxlint rules which are currently under development                                           |
| `--output-file <file>` | The oxlint configuration file where to eslint v9 rules will be written to, default: `.oxlintrc.json` |

\* WARNING: When some `categories` are enabled, this tools will enable more rules with the combination of `plugins`.
Else we need to disable each rule `plugin/categories` combination, which is not covered by your eslint configuration.
This behavior can change in the future.

### User Flow

- Upgrade `oxlint` and `@oxlint/migrate` to the same version.
- Execute `npx @oxlint/migrate`
- (Optional): Disable supported rules via [eslint-plugin-oxlint](https://github.com/oxc-project/eslint-plugin-oxlint)

### TypeScript ESLint Configuration Files

For Deno and Bun, TypeScript configuration files, like `eslint.config.mts`, are natively supported.
For Node.js, you must install [jiti](https://www.npmjs.com/package/jiti) as a dev dependency.

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

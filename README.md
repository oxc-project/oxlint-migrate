# oxlint-migrate

Generates a `.oxlintrc.json` from a existing eslint v9 configuration

🚧 Still under development

## Usage

`npx oxlint-migrate <optional-eslint-v9-config-path>`

When no config file provided, we look at the default eslint config filenames in the current directory.

### User Flow

- Upgrade `oxlint` and `oxlint-migrate` to the same version.
- Execute `npx oxlint-migrate`
- (Optional): Disable supported rules via [eslint-plugin-oxlint](https://github.com/oxc-project/eslint-plugin-oxlint)

## Contributing

### Generate rules

Generates the rules from installed oxlint version

```shell
pnpm generate
pnpm format
```

### Vitest + Integration Test

```shell
pnpm vitest
```

### Manual Testing

```shell
pnpm manual-test
```

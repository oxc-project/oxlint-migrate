import type { ESLint, OxlintConfigRuleSeverity } from './types.js';

type RuleOptionsTransform = (
  options: unknown[],
  plugin: ESLint.Plugin | undefined
) => unknown[];

const ruleSchemaEnum = (
  plugin: ESLint.Plugin | undefined,
  ruleName: string
): unknown[] | undefined => {
  const rule = (plugin?.rules as Record<string, unknown> | undefined)?.[
    ruleName
  ] as { meta?: { schema?: unknown } } | undefined;
  const schema = rule?.meta?.schema;
  const first = Array.isArray(schema) ? schema[0] : undefined;
  const values = (first as { enum?: unknown } | undefined)?.enum;
  return Array.isArray(values) ? values : undefined;
};

/**
 * `eslint-plugin-import-lite` renamed the options of this rule
 * (`prefer-top-level` → `top-level`, `prefer-inline` → `inline`) and reused
 * `prefer-top-level` for a looser mode that Oxlint calls
 * `prefer-top-level-if-only-type-imports`.
 * `@antfu/eslint-config` registers import-lite under the `import` namespace.
 * @link https://github.com/9romise/eslint-plugin-import-lite/blob/v0.6.0/src/rules/consistent-type-specifier-style/README.md
 */
const consistentTypeSpecifierStyle: RuleOptionsTransform = (
  options,
  plugin
) => {
  const [mode, ...rest] = options;
  const isImportLite = ruleSchemaEnum(
    plugin,
    'consistent-type-specifier-style'
  )?.includes('top-level');

  switch (mode) {
    case 'top-level':
      return ['prefer-top-level', ...rest];
    case 'inline':
      return ['prefer-inline', ...rest];
    case 'prefer-top-level':
      return isImportLite
        ? ['prefer-top-level-if-only-type-imports', ...rest]
        : options;
    default:
      return options;
  }
};

const ruleOptionsTransforms: Record<string, RuleOptionsTransform> = {
  'import/consistent-type-specifier-style': consistentTypeSpecifierStyle,
};

/**
 * Rewrites ESLint rule options that Oxlint spells differently.
 *
 * @param canonicalRule - the Oxlint rule name, e.g. `import/consistent-type-specifier-style`
 * @param config - the normalized ESLint rule config
 * @param plugin - the ESLint plugin registered under the rule's prefix, if known
 * @returns a new config when options changed, otherwise `config` itself
 */
export const transformRuleOptions = (
  canonicalRule: string,
  config: OxlintConfigRuleSeverity,
  plugin: ESLint.Plugin | undefined
): OxlintConfigRuleSeverity => {
  const transform = ruleOptionsTransforms[canonicalRule];
  if (transform === undefined || !Array.isArray(config) || config.length < 2) {
    return config;
  }

  const [severity, ...options] = config;
  const transformed = transform(options, plugin);
  return transformed === options ? config : [severity, ...transformed];
};

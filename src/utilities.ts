import unsupportedRulesJson from './generated/unsupported-rules.json' with { type: 'json' };
import { rulesPrefixesForPlugins } from './constants.js';

// thanks to https://stackoverflow.com/a/77278013/7387397
export const isEqualDeep = <T>(a: T, b: T): boolean => {
  if (a === b) {
    return true;
  }

  const bothAreObjects =
    a && b && typeof a === 'object' && typeof b === 'object';

  return Boolean(
    bothAreObjects &&
    Object.keys(a).length === Object.keys(b).length &&
    Object.entries(a).every(([k, v]) => isEqualDeep(v, b[k as keyof T]))
  );
};

/**
 * Builds a lookup map of unsupported rule explanations.
 * Converts oxc-style rule keys (e.g. "eslint/no-dupe-args", "react/immutability")
 * to all matching ESLint-style keys, using rulesPrefixesForPlugins for aliases
 * (e.g. react → react-hooks/react-refresh, import → import-x, node → n).
 */
export function buildUnsupportedRuleExplanations(): Record<string, string> {
  const explanations: Record<string, string> = {};

  for (const [key, value] of Object.entries(
    unsupportedRulesJson.unsupportedRules
  )) {
    const slashIdx = key.indexOf('/');
    const oxlintPlugin = key.slice(0, slashIdx);
    const ruleName = key.slice(slashIdx + 1);

    // "eslint/rule-name" → "rule-name" (no prefix in ESLint)
    if (oxlintPlugin === 'eslint') {
      explanations[ruleName] = value;
      continue;
    }

    // Register under every ESLint prefix that maps to this oxlint plugin.
    // e.g. for "react/immutability", this registers react/, react-hooks/, react-refresh/.
    for (const [eslintPrefix, plugin] of Object.entries(
      rulesPrefixesForPlugins
    )) {
      if (plugin === oxlintPlugin) {
        explanations[`${eslintPrefix}/${ruleName}`] = value;
      }
    }
  }

  return explanations;
}

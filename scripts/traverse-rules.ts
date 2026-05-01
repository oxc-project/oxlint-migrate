import { execSync } from 'node:child_process';
import { typescriptRulesExtendEslintRules } from '../src/constants.js';

export type Rule = {
  value: string;
  scope: string;
  category: string;
  type_aware: boolean;
};

/**
 * Read the rules from oxlint command and returns an array of Rule-Objects
 */
function readRulesFromCommand(): Rule[] {
  // do not handle the exception
  const oxlintOutput = execSync(`npx oxlint --rules --format=json`, {
    encoding: 'utf8',
    stdio: 'pipe',
  });

  // do not handle the exception
  return JSON.parse(oxlintOutput);
}

/**
 * oxlint returns the value without a scope name.
 * Uses the canonical Oxlint scope (with underscores replaced by hyphens).
 */
function fixValueOfRule(rule: Rule): void {
  if (rule.scope === 'eslint') {
    return;
  }

  rule.value = `${rule.scope.replaceAll('_', '-')}/${rule.value}`;
}

/**
 * Some rules are reimplemented in another scope,
 * we need to set up their aliases so we can discover
 * them in the list of rules.
 *
 * Alias values use canonical Oxlint names (e.g. `typescript/` not `@typescript-eslint/`).
 * Input normalization in the migration tool converts ESLint-style names to
 * canonical form before matching, so these aliases just need to cover cases
 * where a rule exists under multiple canonical scopes.
 */
function getAliasRules(rule: Rule): Rule | undefined {
  if (
    rule.scope === 'eslint' &&
    typescriptRulesExtendEslintRules.includes(rule.value)
  ) {
    return {
      value: `typescript/${rule.value}`,
      scope: 'typescript',
      category: rule.category,
      type_aware: rule.type_aware,
    };
  }
}

export function traverseRules(): Rule[] {
  // get all rules and filter the ignored one
  const rules = readRulesFromCommand().filter(
    (rule) => !['oxc'].includes(rule.scope)
  );

  const aliasRules: Rule[] = [];

  for (const rule of rules) {
    const aliasRule = getAliasRules(rule);
    if (aliasRule) {
      aliasRules.push(aliasRule);
    }

    fixValueOfRule(rule);
  }

  return [...rules, ...aliasRules];
}

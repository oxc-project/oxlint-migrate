import path from 'node:path';
import { RuleSkipCategory, SkippedRule } from '../src/types.js';

export type MigrationOutputData = {
  outputFileName: string;
  enabledRulesCount: number;
  skippedRules: SkippedRule[];
  cliOptions: {
    withNursery: boolean;
    typeAware: boolean;
  };
  eslintConfigPath?: string;
};

type SkippedRulesByCategory = Partial<Record<RuleSkipCategory, string[]>>;

/**
 * Aggregates skipped rules by their category
 * @param skippedRules Array of skipped rules with their categories
 * @returns Object mapping categories to arrays of rule names
 */
export function aggregateSkippedRulesByCategory(
  skippedRules: SkippedRule[]
): SkippedRulesByCategory {
  const byCategory: SkippedRulesByCategory = {};
  for (const rule of skippedRules) {
    // TypeScript does not narrow indexed access after `??=`.
    // so store the result in a local variable to get a non-undefined `string[]`.
    const list = (byCategory[rule.category] ??= []);
    list.push(rule.ruleName);
  }
  return byCategory;
}

/**
 * Formats a single category summary line with count and examples
 * @param count Number of rules in this category
 * @param label Display label for the category
 * @param examples Array of rule names to show as examples
 * @param maxExamples Maximum number of examples to show (default: 3)
 * @returns Formatted string line
 */
export function formatCategorySummary(
  count: number,
  label: string,
  examples: string[],
  maxExamples: number = 3
): string {
  const exampleList = examples.slice(0, maxExamples).join(', ');
  const suffix = count > maxExamples ? ', etc.' : '';
  return `   - ${count} ${label} (${exampleList}${suffix})\n`;
}

/**
 * Detects which CLI flags are missing and could enable more rules
 * @param byCategory Skipped rules aggregated by category
 * @param cliOptions Current CLI options
 * @returns Array of flag strings to suggest
 */
export function detectMissingFlags(
  byCategory: SkippedRulesByCategory,
  cliOptions: { withNursery: boolean; typeAware: boolean }
): string[] {
  const missingFlags: string[] = [];

  const nurseryCount = byCategory['nursery']?.length || 0;
  if (nurseryCount > 0 && !cliOptions.withNursery) {
    missingFlags.push('--with-nursery');
  }

  const typeAwareCount = byCategory['type-aware']?.length || 0;
  if (typeAwareCount > 0 && !cliOptions.typeAware) {
    missingFlags.push('--type-aware');
  }

  return missingFlags;
}

/**
 * Formats the complete migration output message
 * @param data Migration output data
 * @returns Formatted output string ready for display
 */
export function formatMigrationOutput(data: MigrationOutputData): string {
  let output = '';

  // Success message with enabled rules count
  if (data.enabledRulesCount > 0) {
    output += `\n✨ ${data.outputFileName} created with ${data.enabledRulesCount} rules.\n`;
  }

  // Skipped rules summary
  if (data.skippedRules.length > 0) {
    const byCategory = aggregateSkippedRulesByCategory(data.skippedRules);

    const nurseryCount = byCategory['nursery']?.length || 0;
    const typeAwareCount = byCategory['type-aware']?.length || 0;
    const unsupportedCount = byCategory['unsupported']?.length || 0;

    output += `\n⚠️  ${data.skippedRules.length} rules skipped:\n`;

    if (nurseryCount > 0) {
      output += formatCategorySummary(
        nurseryCount,
        'Nursery   ',
        byCategory['nursery']!,
        3
      ).replace('(', '(Experimental: ');
    }

    if (typeAwareCount > 0) {
      output += formatCategorySummary(
        typeAwareCount,
        'Type-aware',
        byCategory['type-aware']!,
        3
      ).replace('(', '(Requires TS info: ');
    }

    if (unsupportedCount > 0) {
      output += formatCategorySummary(
        unsupportedCount,
        'Unsupported',
        byCategory['unsupported']!,
        3
      );
    }

    // Suggest missing flags
    const missingFlags = detectMissingFlags(byCategory, data.cliOptions);
    if (missingFlags.length > 0) {
      const eslintConfigArg = data.eslintConfigPath
        ? ` ${path.basename(data.eslintConfigPath)}`
        : '';
      output += `\n👉 Re-run with flags to include more:\n`;
      output += `npx @oxlint/migrate${eslintConfigArg} ${missingFlags.join(' ')}\n`;
    }
  }

  // Next steps
  if (data.enabledRulesCount > 0) {
    output += `\n🚀 Next:\n`;
    output += `npx oxlint .\n`;
  }

  return output;
}

/**
 * Displays the migration result to the console
 * @param outputMessage Formatted output message
 * @param warnings Additional warnings to display
 */
export function displayMigrationResult(
  outputMessage: string,
  warnings: string[]
): void {
  console.log(outputMessage);

  for (const warning of warnings) {
    console.warn(warning);
  }
}

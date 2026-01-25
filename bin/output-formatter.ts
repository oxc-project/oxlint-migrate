import path from 'node:path';
import { SkippedCategoryGroup, RuleSkippedCategory } from '../src/types.js';

type CategoryMetadata = {
  label: string;
  description?: string;
};

const CATEGORY_METADATA: Record<RuleSkippedCategory, CategoryMetadata> = {
  nursery: { label: 'Nursery', description: 'Experimental:' },
  'type-aware': { label: 'Type-aware', description: 'Requires TS info:' },
  unsupported: { label: 'Unsupported' },
};
const MAX_LABEL_LENGTH = Math.max(
  ...Object.values(CATEGORY_METADATA).map((meta) => meta.label.length)
);

export type MigrationOutputData = {
  outputFileName: string;
  enabledRulesCount: number;
  skippedRulesByCategory: SkippedCategoryGroup;
  cliOptions: {
    withNursery: boolean;
    typeAware: boolean;
    details?: boolean;
  };
  eslintConfigPath?: string;
};

/**
 * Formats a category summary as either inline (with example) or vertical list
 */
export function formatCategorySummary(
  count: number,
  category: RuleSkippedCategory,
  examples: string[],
  showAll: boolean
): string {
  const meta = CATEGORY_METADATA[category];
  const paddedLabel = meta.label.padEnd(MAX_LABEL_LENGTH);

  if (showAll) {
    // vertical list format
    let output = `     - ${count} ${paddedLabel}\n`;
    for (const rule of examples) {
      output += `       - ${rule}\n`;
    }
    return output;
  } else {
    // inline format with examples
    const maxExamples = 3;
    const displayExamples = examples.slice(0, maxExamples);
    const exampleList = displayExamples.join(', ');
    const suffix = count > maxExamples ? ', etc.' : '';
    const prefix = meta.description ? `${meta.description} ` : '';
    return `     - ${count} ${paddedLabel} (${prefix}${exampleList}${suffix})\n`;
  }
}

/**
 * Detects which CLI flags are missing and could enable more rules
 */
export function detectMissingFlags(
  byCategory: SkippedCategoryGroup,
  cliOptions: { withNursery: boolean; typeAware: boolean }
): string[] {
  const missingFlags: string[] = [];

  if (byCategory.nursery.length > 0 && !cliOptions.withNursery) {
    missingFlags.push('--with-nursery');
  }

  if (byCategory['type-aware'].length > 0 && !cliOptions.typeAware) {
    missingFlags.push('--type-aware');
  }

  return missingFlags;
}

/**
 * Formats the complete migration output message
 */
export function formatMigrationOutput(data: MigrationOutputData): string {
  let output = '';
  const showAll = data.cliOptions.details || false;

  if (data.enabledRulesCount === 0) {
    output += `\n⚠️ ${data.outputFileName} created with no rules enabled.\n`;
  } else {
    output += `\n✨ ${data.outputFileName} created with ${data.enabledRulesCount} rules.\n`;
  }

  const totalSkipped =
    data.skippedRulesByCategory.nursery.length +
    data.skippedRulesByCategory['type-aware'].length +
    data.skippedRulesByCategory.unsupported.length;

  if (totalSkipped > 0) {
    const byCategory = data.skippedRulesByCategory;

    const nurseryCount = byCategory.nursery.length;
    const typeAwareCount = byCategory['type-aware'].length;
    const unsupportedCount = byCategory.unsupported.length;

    output += `\n   Skipped ${totalSkipped} rules:\n`;

    if (nurseryCount > 0) {
      output += formatCategorySummary(
        nurseryCount,
        'nursery',
        byCategory.nursery,
        showAll
      );
    }

    if (typeAwareCount > 0) {
      output += formatCategorySummary(
        typeAwareCount,
        'type-aware',
        byCategory['type-aware'],
        showAll
      );
    }

    if (unsupportedCount > 0) {
      output += formatCategorySummary(
        unsupportedCount,
        'unsupported',
        byCategory.unsupported,
        showAll
      );
    }

    if (!showAll) {
      const maxExamples = 3;
      const hasOmittedRules =
        nurseryCount > maxExamples ||
        typeAwareCount > maxExamples ||
        unsupportedCount > maxExamples;

      if (hasOmittedRules) {
        output += `\n     Tip: Use --details to see the full list.\n`;
      }
    }

    // Suggest missing flags
    const missingFlags = detectMissingFlags(byCategory, data.cliOptions);
    if (missingFlags.length > 0) {
      const eslintConfigArg = data.eslintConfigPath
        ? ` ${path.basename(data.eslintConfigPath)}`
        : '';
      output += `\n👉 Re-run with flags to include more:\n`;
      output += `     npx @oxlint/migrate${eslintConfigArg} ${missingFlags.join(' ')}\n`;
    }
  }

  if (data.enabledRulesCount > 0) {
    output += `\n🚀 Next:\n`;
    output += `     npx oxlint .\n`;
  }

  return output;
}

export function displayMigrationResult(
  outputMessage: string,
  warnings: string[]
): void {
  console.log(outputMessage);

  for (const warning of warnings) {
    console.warn(warning);
  }
}

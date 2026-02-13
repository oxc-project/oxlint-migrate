import path from 'node:path';
import { SkippedCategoryGroup, RuleSkippedCategory } from '../src/types.js';
import unsupportedRulesJson from '../scripts/generated/unsupported-rules.json' with { type: 'json' };

// Convert oxc-style rule keys to ESLint-style keys:
// - "eslint/no-dupe-args" → "no-dupe-args"
// - "typescript/rule-name" → "@typescript-eslint/rule-name"
// - Other keys pass through unchanged
const unsupportedRuleExplanations: Record<string, string> = {};
for (const [key, value] of Object.entries(
  unsupportedRulesJson.unsupportedRules
)) {
  let eslintKey: string;
  if (key.startsWith('eslint/')) {
    eslintKey = key.slice('eslint/'.length);
  } else if (key.startsWith('typescript/')) {
    eslintKey = `@typescript-eslint/${key.slice('typescript/'.length)}`;
  } else {
    eslintKey = key;
  }
  unsupportedRuleExplanations[eslintKey] = value;
}

type CategoryMetadata = {
  label: string;
  description?: string;
};

const CATEGORY_METADATA: Record<RuleSkippedCategory, CategoryMetadata> = {
  nursery: { label: 'Nursery', description: 'Experimental:' },
  'type-aware': { label: 'Type-aware', description: 'Requires TS info:' },
  'js-plugins': { label: 'JS Plugins', description: 'Requires JS plugins:' },
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
    details: boolean;
    jsPlugins: boolean;
  };
  eslintConfigPath?: string;
};

/**
 * Formats a category summary as either inline (with example) or vertical list
 */
export function formatCategorySummary(
  count: number,
  category: RuleSkippedCategory,
  rules: string[],
  showAll: boolean
): string {
  const meta = CATEGORY_METADATA[category];

  if (!showAll) {
    // inline format with rules
    const maxRules = 3;
    const displayRules = rules.slice(0, maxRules);
    const exampleList = displayRules.join(', ');
    const suffix = count > maxRules ? ', and more' : '';
    const prefix = meta.description ? `${meta.description} ` : '';

    // pad for vertical alignment
    const paddedCount = String(count).padStart(3);
    const paddedLabel = meta.label.padEnd(MAX_LABEL_LENGTH);

    return `     - ${paddedCount} ${paddedLabel} (${prefix}${exampleList}${suffix})\n`;
  }

  // vertical list format
  // Padding is unnecessary here as vertical alignment is interrupted by the example list.
  let output = `     - ${count} ${meta.label}\n`;
  for (const rule of rules) {
    const explanation =
      category === 'unsupported'
        ? unsupportedRuleExplanations[rule]
        : undefined;
    if (explanation) {
      output += `       - ${rule}: ${explanation}\n`;
    } else {
      output += `       - ${rule}\n`;
    }
  }
  return output;
}

/**
 * Detects which CLI flags are missing and could enable more rules
 */
export function detectMissingFlags(
  byCategory: SkippedCategoryGroup,
  cliOptions: { withNursery: boolean; typeAware: boolean; jsPlugins?: boolean }
): string[] {
  const missingFlags: string[] = [];

  if (byCategory.nursery.length > 0 && !cliOptions.withNursery) {
    missingFlags.push('--with-nursery');
  }

  if (byCategory['type-aware'].length > 0 && !cliOptions.typeAware) {
    missingFlags.push('--type-aware');
  }

  if (byCategory['js-plugins'].length > 0 && !cliOptions.jsPlugins) {
    missingFlags.push('--js-plugins');
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

  const byCategory = data.skippedRulesByCategory;
  const nurseryCount = byCategory.nursery.length;
  const typeAwareCount = byCategory['type-aware'].length;
  const unsupportedCount = byCategory.unsupported.length;
  const jsPluginsCount = byCategory['js-plugins'].length;
  const totalSkipped =
    nurseryCount + typeAwareCount + unsupportedCount + jsPluginsCount;

  if (totalSkipped > 0) {
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

    if (jsPluginsCount > 0) {
      output += formatCategorySummary(
        jsPluginsCount,
        'js-plugins',
        byCategory['js-plugins'],
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
        unsupportedCount > maxExamples ||
        jsPluginsCount > maxExamples;

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

import {
  Reporter,
  SkippedCategoryGroup,
  RuleSkippedCategory,
} from './types.js';

export class DefaultReporter implements Reporter {
  private warnings = new Set<string>();
  private skippedRules = new Map<RuleSkippedCategory, Set<string>>([
    ['nursery', new Set<string>()],
    ['type-aware', new Set<string>()],
    ['unsupported', new Set<string>()],
  ]);

  public addWarning(message: string): void {
    this.warnings.add(message);
  }

  public getWarnings(): string[] {
    return Array.from(this.warnings);
  }

  public markSkipped(rule: string, category: RuleSkippedCategory): void {
    this.skippedRules.get(category)?.add(rule);
  }

  public removeSkipped(rule: string, category: RuleSkippedCategory): void {
    this.skippedRules.get(category)?.delete(rule);
  }

  public getSkippedRulesByCategory(): SkippedCategoryGroup {
    const result: SkippedCategoryGroup = {
      nursery: [],
      'type-aware': [],
      unsupported: [],
    };
    for (const [category, rules] of this.skippedRules) {
      result[category] = Array.from(rules);
    }
    return result;
  }
}

export class SilentReporter implements Reporter {
  public addWarning(_message: string): void {
    // Do nothing
  }

  public getWarnings(): string[] {
    return [];
  }

  public markSkipped(_rule: string, _category: RuleSkippedCategory): void {
    // Do nothing
  }

  public removeSkipped(_rule: string, _category: RuleSkippedCategory): void {
    // Do nothing
  }

  public getSkippedRulesByCategory(): SkippedCategoryGroup {
    return {
      nursery: [],
      'type-aware': [],
      unsupported: [],
    };
  }
}

import {
  Reporter,
  SkippedCategoryGroup,
  RuleSkippedCategory,
} from './types.js';

export class DefaultReporter implements Reporter {
  private reports = new Set<string>();
  private skippedRules = new Map<RuleSkippedCategory, Set<string>>([
    ['nursery', new Set<string>()],
    ['type-aware', new Set<string>()],
    ['unsupported', new Set<string>()],
  ]);

  public report(message: string): void {
    this.reports.add(message);
  }

  public remove(message: string): void {
    this.reports.delete(message);
  }

  public getReports(): string[] {
    return Array.from(this.reports);
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
  public report(_message: string): void {
    // Do nothing
  }

  public remove(_message: string): void {
    // Do nothing
  }

  public getReports(): string[] {
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

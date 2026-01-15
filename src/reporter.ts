import { Reporter, SkippedRule, RuleSkipCategory } from './types.js';

export class DefaultReporter implements Reporter {
  private warnings = new Set<string>();
  private skippedRules = new Map<RuleSkipCategory, Set<string>>([
    ['nursery', new Set<string>()],
    ['type-aware', new Set<string>()],
    ['unsupported', new Set<string>()],
  ]);
  private enabledRulesCount = 0;

  public addWarning(message: string): void {
    this.warnings.add(message);
  }

  public getWarnings(): string[] {
    return Array.from(this.warnings);
  }

  public markSkipped(rule: string, category: RuleSkipCategory): void {
    this.skippedRules.get(category)?.add(rule);
  }

  public removeSkipped(rule: string, category: RuleSkipCategory): void {
    this.skippedRules.get(category)?.delete(rule);
  }

  public getSkippedRules(): SkippedRule[] {
    const result: SkippedRule[] = [];

    for (const [category, rules] of this.skippedRules) {
      for (const rule of rules) {
        result.push({ ruleName: rule, category });
      }
    }

    return result;
  }

  public setEnabledRulesCount(count: number): void {
    this.enabledRulesCount = count;
  }

  public getEnabledRulesCount(): number {
    return this.enabledRulesCount;
  }
}

export class SilentReporter implements Reporter {
  public addWarning(_message: string): void {
    // Do nothing
  }

  public getWarnings(): string[] {
    return [];
  }

  public markSkipped(_rule: string, _category: RuleSkipCategory): void {
    // Do nothing
  }

  public removeSkipped(_rule: string, _category: RuleSkipCategory): void {
    // Do nothing
  }

  public getSkippedRules(): SkippedRule[] {
    return [];
  }

  public setEnabledRulesCount(_count: number): void {
    // Do nothing
  }

  public getEnabledRulesCount(): number {
    return 0;
  }
}

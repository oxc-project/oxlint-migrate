import { Reporter, SkippedRule, RuleSkipCategory } from './types.js';

export class DefaultReporter implements Reporter {
  private reports = new Set<string>();
  private skippedRules = new Set<string>();
  private enabledRulesCount = 0;

  public report(message: string): void {
    this.reports.add(message);
  }

  public remove(message: string): void {
    this.reports.delete(message);
  }

  public getReports(): string[] {
    return Array.from(this.reports);
  }

  public markSkipped(rule: string, category: RuleSkipCategory): void {
    const key = `${category}:${rule}`;
    this.skippedRules.add(key);
  }

  public getSkippedRules(): SkippedRule[] {
    return Array.from(this.skippedRules).map((key) => {
      const [category, ...ruleNameParts] = key.split(':');
      return {
        ruleName: ruleNameParts.join(':'),
        category: category as RuleSkipCategory,
      };
    });
  }

  public setEnabledRulesCount(count: number): void {
    this.enabledRulesCount = count;
  }

  public getEnabledRulesCount(): number {
    return this.enabledRulesCount;
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

  public markSkipped(_rule: string, _category: RuleSkipCategory): void {
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

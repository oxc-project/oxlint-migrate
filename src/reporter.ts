import { Reporter, SkippedRule, RuleSkipCategory } from './types.js';

export class DefaultReporter implements Reporter {
  private reports = new Set<string>();
  private skippedRulesSet = new Set<string>();
  private skippedRules: SkippedRule[] = [];
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
    if (!this.skippedRulesSet.has(key)) {
      this.skippedRulesSet.add(key);
      this.skippedRules.push({ ruleName: rule, category });
    }
  }

  public getSkippedRules(): SkippedRule[] {
    return this.skippedRules;
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

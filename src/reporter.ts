import { Reporter, SkippedRule, RuleSkipCategory } from './types.js';

export class DefaultReporter implements Reporter {
  private warnings = new Set<string>();
  private skippedRules = new Set<string>();
  private enabledRulesCount = 0;

  public addWarning(message: string): void {
    this.warnings.add(message);
  }

  public removeWarning(message: string): void {
    this.warnings.delete(message);
  }

  public getWarnings(): string[] {
    return Array.from(this.warnings);
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
  public addWarning(_message: string): void {
    // Do nothing
  }

  public removeWarning(_message: string): void {
    // Do nothing
  }

  public getWarnings(): string[] {
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

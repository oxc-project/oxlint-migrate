import { Reporter } from './types.js';

export class DefaultReporter implements Reporter {
  private reports = new Set<string>();

  public report(message: string): void {
    this.reports.add(message);
  }

  public failedToParse(filePath: string): void {
    this.reports.add(`${filePath}: failed to parse`);
  }
  public unsupportedRule(rule: string): void {
    this.reports.add(`unsupported rule: ${rule}`);
  }
  public unsupportedRuleInDevelopment(rule: string): void {
    this.reports.add(`unsupported rule, but in development: ${rule}`);
  }
  public unsupportedRuleForPlugin(rule: string): void {
    this.reports.add(`unsupported plugin for rule: ${rule}`);
  }
  public typeAwareRuleNotEnabled(rule: string): void {
    this.reports.add(
      `type-aware rule detected, but \`--type-aware\` is not enabled: ${rule}`
    );
  }
  public ignoreListInsideOverrides(): void {
    this.reports.add(`ignore list inside overrides is not supported`);
  }

  public specialParserDetected(parserName: string): void {
    this.reports.add(`special parser detected: ${parserName}`);
  }

  public getReports(): string[] {
    return Array.from(this.reports);
  }
}

export class SilentReporter implements Reporter {
  public failedToParse(_filePath: string): void {
    // Do nothing
  }
  public unsupportedRule(_rule: string): void {
    // Do nothing
  }
  public unsupportedRuleInDevelopment(_rule: string): void {
    // Do nothing
  }
  public unsupportedRuleForPlugin(_rule: string): void {
    // Do nothing
  }
  public typeAwareRuleNotEnabled(_rule: string): void {
    // Do nothing
  }
  public ignoreListInsideOverrides(): void {
    // Do nothing
  }
  public specialParserDetected(_parserName: string): void {
    // Do nothing
  }
  public report(_message: string): void {
    // Do nothing
  }
  public getReports(): string[] {
    return [];
  }
}

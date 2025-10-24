import { Reporter } from './types.js';

export class DefaultReporter implements Reporter {
  private reports = new Set<string>();

  public report(message: string): void {
    this.reports.add(message);
  }

  public getReports(): string[] {
    return Array.from(this.reports);
  }
}

export class SilentReporter implements Reporter {
  public report(_message: string): void {
    // Do nothing
  }

  public getReports(): string[] {
    return [];
  }
}

import { Reporter } from './types.js';

export class DefaultReporter implements Reporter {
  private reports = new Set<string>();

  public report(message: string): void {
    this.reports.add(message);
  }

  public remove(message: string): void {
    this.reports.delete(message);
  }

  public getReports(): string[] {
    return Array.from(this.reports);
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
}

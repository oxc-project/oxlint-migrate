import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { detectPackageManager } from './package-uninstaller.js';
import {
  existsSync,
  mkdirSync,
  writeFileSync,
  unlinkSync,
  rmdirSync,
} from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';

describe('detectPackageManager', () => {
  let testDir: string;

  beforeEach(() => {
    // Create a temporary test directory
    testDir = path.join(tmpdir(), `test-pkg-mgr-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    // Clean up test directory and files
    try {
      const files = [
        'pnpm-lock.yaml',
        'yarn.lock',
        'bun.lockb',
        'package-lock.json',
      ];
      for (const file of files) {
        const filePath = path.join(testDir, file);
        if (existsSync(filePath)) {
          unlinkSync(filePath);
        }
      }
      rmdirSync(testDir);
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  it('should detect pnpm when pnpm-lock.yaml exists', () => {
    writeFileSync(path.join(testDir, 'pnpm-lock.yaml'), '');
    expect(detectPackageManager(testDir)).toBe('pnpm');
  });

  it('should detect yarn when yarn.lock exists', () => {
    writeFileSync(path.join(testDir, 'yarn.lock'), '');
    expect(detectPackageManager(testDir)).toBe('yarn');
  });

  it('should detect bun when bun.lockb exists', () => {
    writeFileSync(path.join(testDir, 'bun.lockb'), '');
    expect(detectPackageManager(testDir)).toBe('bun');
  });

  it('should default to npm when no lock file exists', () => {
    expect(detectPackageManager(testDir)).toBe('npm');
  });

  it('should prioritize pnpm over yarn when both lock files exist', () => {
    writeFileSync(path.join(testDir, 'pnpm-lock.yaml'), '');
    writeFileSync(path.join(testDir, 'yarn.lock'), '');
    expect(detectPackageManager(testDir)).toBe('pnpm');
  });

  it('should prioritize yarn over bun when both lock files exist', () => {
    writeFileSync(path.join(testDir, 'yarn.lock'), '');
    writeFileSync(path.join(testDir, 'bun.lockb'), '');
    expect(detectPackageManager(testDir)).toBe('yarn');
  });
});

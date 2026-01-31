import { existsSync } from 'node:fs';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { spawn } from 'node:child_process';

type PackageManager = 'npm' | 'pnpm' | 'yarn' | 'bun';

/**
 * Detects the package manager used in the current project
 */
export function detectPackageManager(cwd: string): PackageManager {
  // Check for lock files
  if (existsSync(path.join(cwd, 'pnpm-lock.yaml'))) {
    return 'pnpm';
  }
  if (existsSync(path.join(cwd, 'yarn.lock'))) {
    return 'yarn';
  }
  if (existsSync(path.join(cwd, 'bun.lockb'))) {
    return 'bun';
  }
  // Default to npm
  return 'npm';
}

/**
 * Prompts user to uninstall the package
 * Returns true if user wants to uninstall, false otherwise
 */
export async function promptForUninstall(): Promise<boolean> {
  // Check if we're in a non-interactive terminal
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    return false;
  }

  return new Promise((resolve) => {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question(
      '\n🗑️  Do you want to uninstall @oxlint/migrate? (y/N): ',
      (answer) => {
        rl.close();
        const normalized = answer.trim().toLowerCase();
        resolve(normalized === 'y' || normalized === 'yes');
      }
    );
  });
}

/**
 * Uninstalls the package using the detected package manager
 */
export async function uninstallPackage(
  packageManager: PackageManager
): Promise<void> {
  const commands: Record<PackageManager, [string, string[]]> = {
    npm: ['npm', ['uninstall', '@oxlint/migrate']],
    pnpm: ['pnpm', ['remove', '@oxlint/migrate']],
    yarn: ['yarn', ['remove', '@oxlint/migrate']],
    bun: ['bun', ['remove', '@oxlint/migrate']],
  };

  const [command, args] = commands[packageManager];

  console.log(`\n📦 Uninstalling @oxlint/migrate using ${packageManager}...`);

  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, {
      stdio: 'inherit',
      shell: true,
    });

    proc.on('close', (code) => {
      if (code === 0) {
        console.log('✅ Successfully uninstalled @oxlint/migrate\n');
        resolve();
      } else {
        console.error(
          `❌ Failed to uninstall @oxlint/migrate (exit code: ${code})\n`
        );
        reject(new Error(`Uninstall failed with code ${code}`));
      }
    });

    proc.on('error', (err) => {
      console.error(`❌ Error uninstalling: ${err.message}\n`);
      reject(err);
    });
  });
}

/**
 * Main function to handle the uninstall flow
 */
export async function handleUninstall(
  cwd: string,
  skipPrompt: boolean = false
): Promise<void> {
  // If skip prompt is true, don't do anything
  if (skipPrompt) {
    return;
  }

  const shouldUninstall = await promptForUninstall();

  if (shouldUninstall) {
    const packageManager = detectPackageManager(cwd);
    try {
      await uninstallPackage(packageManager);
    } catch {
      // Error already logged, just continue
    }
  }
}

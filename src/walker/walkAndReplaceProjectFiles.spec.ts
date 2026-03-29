import { describe, expect, it, vi } from 'vitest';
import { walkAndReplaceProjectFiles } from './index.js';
import { DefaultReporter } from '../reporter.js';

describe('walkAndReplaceProjectFiles', () => {
  const makeOptions = () => ({
    reporter: new DefaultReporter(),
  });

  it('should process files and write back changed ones', async () => {
    const files = ['/tmp/a.ts', '/tmp/b.ts'];
    const fileContents: Record<string, string> = {
      '/tmp/a.ts': '// eslint-disable-next-line no-debugger\ndebugger;',
      '/tmp/b.ts': '// eslint-disable-next-line no-console\nconsole.log("hi");',
    };

    const readFile = (path: string) => fileContents[path];
    const writeFile = vi.fn().mockResolvedValue(undefined);

    await walkAndReplaceProjectFiles(files, readFile, writeFile, makeOptions());

    expect(writeFile).toHaveBeenCalledTimes(2);
    expect(writeFile).toHaveBeenCalledWith(
      '/tmp/a.ts',
      '// oxlint-disable-next-line no-debugger\ndebugger;'
    );
    expect(writeFile).toHaveBeenCalledWith(
      '/tmp/b.ts',
      '// oxlint-disable-next-line no-console\nconsole.log("hi");'
    );
  });

  it('should skip files with no eslint comments', async () => {
    const files = ['/tmp/clean.ts'];
    const readFile = () => 'const x = 1;\n';
    const writeFile = vi.fn().mockResolvedValue(undefined);

    await walkAndReplaceProjectFiles(files, readFile, writeFile, makeOptions());

    expect(writeFile).not.toHaveBeenCalled();
  });

  it('should skip files that return undefined from readFile', async () => {
    const files = ['/tmp/missing.ts', '/tmp/exists.ts'];
    const readFile = (path: string) =>
      path === '/tmp/exists.ts'
        ? '// eslint-disable-next-line no-debugger\ndebugger;'
        : undefined;
    const writeFile = vi.fn().mockResolvedValue(undefined);

    await walkAndReplaceProjectFiles(files, readFile, writeFile, makeOptions());

    expect(writeFile).toHaveBeenCalledTimes(1);
    expect(writeFile).toHaveBeenCalledWith(
      '/tmp/exists.ts',
      '// oxlint-disable-next-line no-debugger\ndebugger;'
    );
  });

  it('should handle an empty file list', async () => {
    const writeFile = vi.fn().mockResolvedValue(undefined);

    await walkAndReplaceProjectFiles([], () => '', writeFile, makeOptions());

    expect(writeFile).not.toHaveBeenCalled();
  });

  it('should process files with mixed changed and unchanged comments', async () => {
    const files = ['/tmp/mixed.ts'];
    const readFile = () =>
      '// regular comment\n// eslint-disable-next-line no-debugger\ndebugger;\n// another comment\n';
    const writeFile = vi.fn().mockResolvedValue(undefined);

    await walkAndReplaceProjectFiles(files, readFile, writeFile, makeOptions());

    expect(writeFile).toHaveBeenCalledTimes(1);
    expect(writeFile).toHaveBeenCalledWith(
      '/tmp/mixed.ts',
      '// regular comment\n// oxlint-disable-next-line no-debugger\ndebugger;\n// another comment\n'
    );
  });

  it('should collect warnings via the reporter', async () => {
    const files = ['/tmp/warn.ts'];
    const readFile = () => '/* eslint eqeqeq: "off" */\nconst x = 1;';
    const writeFile = vi.fn().mockResolvedValue(undefined);
    const options = makeOptions();

    await walkAndReplaceProjectFiles(files, readFile, writeFile, options);

    // Unsupported inline config should not cause a write
    expect(writeFile).not.toHaveBeenCalled();
    // But should produce a warning
    expect(options.reporter!.getWarnings().length).toBeGreaterThan(0);
    expect(options.reporter!.getWarnings()[0]).toContain(
      'inline comment is not supported'
    );
  });

  it('should handle .vue files passed through the walker', async () => {
    const files = ['/tmp/component.vue'];
    const readFile = () =>
      '<template><div>hi</div></template>\n<script>\n// eslint-disable-next-line no-console\nconsole.log("hi");\n</script>';
    const writeFile = vi.fn().mockResolvedValue(undefined);

    await walkAndReplaceProjectFiles(files, readFile, writeFile, makeOptions());

    expect(writeFile).toHaveBeenCalledTimes(1);
    const writtenContent = writeFile.mock.calls[0][1] as string;
    expect(writtenContent).toContain('oxlint-disable-next-line');
    expect(writtenContent).not.toContain('eslint-disable-next-line');
  });
});

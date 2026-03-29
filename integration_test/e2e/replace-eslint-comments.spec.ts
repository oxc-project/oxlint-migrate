import { describe, expect, it } from 'vitest';
import { walkAndReplaceProjectFiles } from '../../src/walker/index.js';
import { DefaultReporter } from '../../src/reporter.js';

describe('--replace-eslint-comments e2e', () => {
  it('should replace eslint comments across multiple file types', async () => {
    const files: Record<string, string> = {
      '/tmp/project/app.ts': `
// eslint-disable-next-line no-debugger
debugger;
/* eslint-disable no-console */
console.log('hello');
/* eslint-enable no-console */
`,
      '/tmp/project/component.vue': `<template>
  <div>Hello</div>
</template>
<script lang="ts">
// eslint-disable-next-line no-console
console.log('vue');
</script>
`,
      '/tmp/project/page.astro': `---
// eslint-disable-next-line no-debugger
debugger;
---
<html><body><h1>Hi</h1></body></html>
`,
      '/tmp/project/widget.svelte': `<script>
/* eslint-disable no-console */
console.log('svelte');
/* eslint-enable no-console */
</script>
<div>Svelte</div>
`,
      '/tmp/project/clean.ts': `const x = 1;\n`,
    };

    const written: Record<string, string> = {};
    const reporter = new DefaultReporter();

    await walkAndReplaceProjectFiles(
      Object.keys(files),
      (path: string) => files[path],
      async (path: string, content: string) => {
        written[path] = content;
      },
      { reporter }
    );

    // Clean file should not be written
    expect(written['/tmp/project/clean.ts']).toBeUndefined();

    // All other files should be written with replacements
    expect(Object.keys(written)).toHaveLength(4);

    // TypeScript file
    expect(written['/tmp/project/app.ts']).toContain(
      'oxlint-disable-next-line no-debugger'
    );
    expect(written['/tmp/project/app.ts']).toContain(
      'oxlint-disable no-console'
    );
    expect(written['/tmp/project/app.ts']).toContain(
      'oxlint-enable no-console'
    );
    expect(written['/tmp/project/app.ts']).not.toContain('eslint-');

    // Vue file
    expect(written['/tmp/project/component.vue']).toContain(
      'oxlint-disable-next-line no-console'
    );
    expect(written['/tmp/project/component.vue']).not.toContain(
      'eslint-disable'
    );
    // Template should be preserved
    expect(written['/tmp/project/component.vue']).toContain('<div>Hello</div>');

    // Astro file
    expect(written['/tmp/project/page.astro']).toContain(
      'oxlint-disable-next-line no-debugger'
    );
    expect(written['/tmp/project/page.astro']).not.toContain('eslint-');

    // Svelte file
    expect(written['/tmp/project/widget.svelte']).toContain(
      'oxlint-disable no-console'
    );
    expect(written['/tmp/project/widget.svelte']).toContain(
      'oxlint-enable no-console'
    );
    expect(written['/tmp/project/widget.svelte']).not.toContain('eslint-');

    // No warnings expected for supported comments
    expect(reporter.getWarnings()).toHaveLength(0);
  });

  it('should report warnings for unsupported comments', async () => {
    const files: Record<string, string> = {
      '/tmp/project/config.ts': `
/* eslint eqeqeq: "off" */
/* global myGlobal */
// eslint-disable-next-line no-debugger
debugger;
`,
    };

    const written: Record<string, string> = {};
    const reporter = new DefaultReporter();

    await walkAndReplaceProjectFiles(
      Object.keys(files),
      (path: string) => files[path],
      async (path: string, content: string) => {
        written[path] = content;
      },
      { reporter }
    );

    // The supported comment should still be replaced
    expect(written['/tmp/project/config.ts']).toContain(
      'oxlint-disable-next-line no-debugger'
    );
    // Unsupported comments should remain as eslint
    expect(written['/tmp/project/config.ts']).toContain('eslint eqeqeq: "off"');
    expect(written['/tmp/project/config.ts']).toContain('global myGlobal');

    // Should have warnings for unsupported inline comments
    const warnings = reporter.getWarnings();
    expect(warnings.length).toBe(2);
    expect(warnings).toContainEqual(
      expect.stringContaining('inline comment is not supported')
    );
    expect(warnings).toContainEqual(
      expect.stringContaining('changing globals with inline comment')
    );
  });

  it('should handle unreadable files gracefully', async () => {
    const files = ['/tmp/project/exists.ts', '/tmp/project/missing.ts'];
    const written: Record<string, string> = {};
    const reporter = new DefaultReporter();

    await walkAndReplaceProjectFiles(
      files,
      (path: string) =>
        path === '/tmp/project/exists.ts'
          ? '// eslint-disable-next-line no-debugger\ndebugger;'
          : undefined,
      async (path: string, content: string) => {
        written[path] = content;
      },
      { reporter }
    );

    // Only the readable file should be processed
    expect(Object.keys(written)).toHaveLength(1);
    expect(written['/tmp/project/exists.ts']).toContain('oxlint-disable');
  });

  it('should snapshot the full transformation of a realistic file', async () => {
    const source = `
import React from 'react';
import { useState } from 'react';

/* eslint-disable no-console */

/**
 * A component that does things.
 */
function App() {
  // eslint-disable-next-line no-debugger
  debugger;

  const [count, setCount] = useState(0);

  // eslint-disable-next-line no-console
  console.log('render count:', count);

  return (
    <div>
      <button onClick={() => setCount(count + 1)}>
        Count: {count}
      </button>
    </div>
  );
}

/* eslint-enable no-console */

export default App;
`;

    const written: Record<string, string> = {};
    const reporter = new DefaultReporter();

    await walkAndReplaceProjectFiles(
      ['/tmp/project/App.tsx'],
      () => source,
      async (path: string, content: string) => {
        written[path] = content;
      },
      { reporter }
    );

    expect({
      output: written['/tmp/project/App.tsx'],
      warnings: reporter.getWarnings(),
    }).toMatchSnapshot();
  });
});

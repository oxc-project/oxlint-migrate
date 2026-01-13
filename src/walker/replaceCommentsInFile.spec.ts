import { describe, expect, it } from 'vitest';
import replaceCommentsInFile from './replaceCommentsInFile.js';
import { DefaultReporter } from '../reporter.js';

describe('replaceCommentsInFile', () => {
  const tsPath = '/tmp/fake-path.ts';
  const vuePath = '/tmp/fake-path.vue';
  const astroPath = '/tmp/fake-path.astro';
  const sveltePath = '/tmp/fake-path.svelte';

  it('should replace multiple line comments', () => {
    const sourceText = `
        // eslint-disable no-debugger
        debugger;
        // eslint-disable no-console -- description
        console.log('hello world');
        `;

    const newSourceText = replaceCommentsInFile(tsPath, sourceText, {});

    expect(newSourceText).toBe(`
        // oxlint-disable no-debugger
        debugger;
        // oxlint-disable no-console -- description
        console.log('hello world');
        `);
  });

  it('should replace multiple block comments', () => {
    const sourceText = `
        /* eslint-disable no-debugger */
        debugger;
        /* eslint-disable no-console -- description */
        console.log('hello world');
        `;

    const newSourceText = replaceCommentsInFile(tsPath, sourceText, {});

    expect(newSourceText).toBe(`
        /* oxlint-disable no-debugger */
        debugger;
        /* oxlint-disable no-console -- description */
        console.log('hello world');
        `);
  });

  it('should replace respect line breaks ', () => {
    const sourceText = `
        /*
        eslint-disable no-debugger
        */
        debugger;
        /*    eslint-disable no-console -- description */

        console.log('hello world');
        `;

    const newSourceText = replaceCommentsInFile(tsPath, sourceText, {});

    expect(newSourceText).toBe(`
        /*
        oxlint-disable no-debugger
        */
        debugger;
        /*    oxlint-disable no-console -- description */

        console.log('hello world');
        `);
  });

  describe('unsupported eslint comments', () => {
    it('should report inline configuration comments', () => {
      const sourceText = `
        /* eslint eqeqeq: "off" */
        debugger;
        /* eslint eqeqeq: "off" -- description */
        console.log('hello world');
        `;
      const reporter = new DefaultReporter();
      const newSourceText = replaceCommentsInFile(tsPath, sourceText, {
        reporter: reporter,
      });
      expect(newSourceText).toBe(sourceText);
      expect(reporter.getWarnings()).toStrictEqual([
        '/tmp/fake-path.ts, char offset 9: changing eslint rules with inline comment is not supported',
        '/tmp/fake-path.ts, char offset 62: changing eslint rules with inline comment is not supported',
      ]);
    });

    it('should report inline global configuration', () => {
      const sourceText = `
        /* global jQuery */
        debugger;
        /* global jQuery -- description */
        console.log('hello world');
        `;
      const reporter = new DefaultReporter();
      const newSourceText = replaceCommentsInFile(tsPath, sourceText, {
        reporter: reporter,
      });
      expect(newSourceText).toBe(sourceText);
      expect(reporter.getWarnings()).toStrictEqual([
        '/tmp/fake-path.ts, char offset 9: changing globals with inline comment is not supported',
        '/tmp/fake-path.ts, char offset 55: changing globals with inline comment is not supported',
      ]);
    });

    it('should ignore standalone eslint comment', () => {
      const sourceText = `
        /* eslint */
        debugger;
        `;
      const reporter = new DefaultReporter();
      const newSourceText = replaceCommentsInFile(tsPath, sourceText, {
        reporter: reporter,
      });
      expect(newSourceText).toBe(sourceText);
      expect(reporter.getWarnings()).toStrictEqual([]);
    });
  });

  describe('special file extensions', () => {
    it('should handle .vue files', () => {
      const sourceText = `
        <template><h1>hello world</h1></template>
        <script>
        /* eslint-disable no-debugger */
        debugger;
        </script>
        <script>
        /* eslint-disable no-console */
        console.log('hello world');
        </script>
      `;
      const newSourceText = replaceCommentsInFile(vuePath, sourceText, {});
      expect(newSourceText).toBe(`
        <template><h1>hello world</h1></template>
        <script>
        /* oxlint-disable no-debugger */
        debugger;
        </script>
        <script>
        /* oxlint-disable no-console */
        console.log('hello world');
        </script>
      `);
    });

    it('should handle typescript syntax in .vue files', () => {
      const sourceText = `
        <script lang="ts">
        import { type Ref } from 'vue';
        /* eslint-disable no-debugger */
        debugger;
        </script>
      `;
      const newSourceText = replaceCommentsInFile(sveltePath, sourceText, {});
      expect(newSourceText).toBe(`
        <script lang="ts">
        import { type Ref } from 'vue';
        /* oxlint-disable no-debugger */
        debugger;
        </script>
      `);
    });

    it('should handle .astro files', () => {
      const sourceText = `
        ---
        /* eslint-disable no-debugger */
        debugger;
        ---
        <script>
        /* eslint-disable no-console */
        console.log('hello world');
        </script>
        <h1>Hello World!</h1>
      `;
      const newSourceText = replaceCommentsInFile(astroPath, sourceText, {});
      expect(newSourceText).toBe(`
        ---
        /* oxlint-disable no-debugger */
        debugger;
        ---
        <script>
        /* oxlint-disable no-console */
        console.log('hello world');
        </script>
        <h1>Hello World!</h1>
      `);
    });

    it('should handle .svelte files', () => {
      const sourceText = `
        <script>
        /* eslint-disable no-debugger */
        debugger;
        </script>
        <script>
        /* eslint-disable no-console */
        console.log('hello world');
        </script>
        <div>Hello Svelte</div>
      `;
      const newSourceText = replaceCommentsInFile(sveltePath, sourceText, {});
      expect(newSourceText).toBe(`
        <script>
        /* oxlint-disable no-debugger */
        debugger;
        </script>
        <script>
        /* oxlint-disable no-console */
        console.log('hello world');
        </script>
        <div>Hello Svelte</div>
      `);
    });

    it('should handle typescript syntax in .svelte files', () => {
      const sourceText = `
        <script lang="ts">
        import { t } from 'svelte-i18n';
        import { type Address, isAddress } from 'viem';
        /* eslint-disable no-debugger */
        debugger;
        </script>
        <script>
        /* eslint-disable no-console */
        console.log('hello world');
        </script>
        <div>Hello Svelte</div>
      `;
      const newSourceText = replaceCommentsInFile(sveltePath, sourceText, {});
      expect(newSourceText).toBe(`
        <script lang="ts">
        import { t } from 'svelte-i18n';
        import { type Address, isAddress } from 'viem';
        /* oxlint-disable no-debugger */
        debugger;
        </script>
        <script>
        /* oxlint-disable no-console */
        console.log('hello world');
        </script>
        <div>Hello Svelte</div>
      `);
    });
  });
});

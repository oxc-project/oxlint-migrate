import { describe, expect, it } from 'vitest';
import replaceCommentsInFile from './replaceCommentsInFile.js';

describe('replaceCommentsInFile', () => {
  const filePath = '/tmp/fake-path.ts';

  it('should replace multiple line comments', () => {
    const sourceText = `
        // eslint-disable no-debugger
        debugger;
        // eslint-disable no-console -- description
        console.log('hello world');
        `;

    const newSourceText = replaceCommentsInFile(filePath, sourceText, {});

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

    const newSourceText = replaceCommentsInFile(filePath, sourceText, {});

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

    const newSourceText = replaceCommentsInFile(filePath, sourceText, {});

    expect(newSourceText).toBe(`
        /*
        oxlint-disable no-debugger
        */
        debugger;
        /*    oxlint-disable no-console -- description */

        console.log('hello world');
        `);
  });
});

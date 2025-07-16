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

  describe('unsupported eslint comments', () => {
    it('should report inline configuration comments', () => {
      const sourceText = `
        /* eslint eqeqeq: "off" */
        debugger;
        /* eslint eqeqeq: "off" -- description */
        console.log('hello world');
        `;
      const reports: string[] = [];
      const newSourceText = replaceCommentsInFile(filePath, sourceText, {
        reporter: reports.push.bind(reports),
      });
      expect(newSourceText).toBe(sourceText);
      expect(reports).toStrictEqual([
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
      const reports: string[] = [];
      const newSourceText = replaceCommentsInFile(filePath, sourceText, {
        reporter: reports.push.bind(reports),
      });
      expect(newSourceText).toBe(sourceText);
      expect(reports).toStrictEqual([
        '/tmp/fake-path.ts, char offset 9: changing globals with inline comment is not supported',
        '/tmp/fake-path.ts, char offset 55: changing globals with inline comment is not supported',
      ]);
    });

    it('should ignore standalone eslint comment', () => {
      const sourceText = `
        /* eslint */
        debugger;
        `;
      const reports: string[] = [];
      const newSourceText = replaceCommentsInFile(filePath, sourceText, {
        reporter: reports.push.bind(reports),
      });
      expect(newSourceText).toBe(sourceText);
      expect(reports).toStrictEqual([]);
    });
  });
});

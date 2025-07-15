import { describe, expect, it } from 'vitest';
import replaceRuleDirectivesInFile from './replaceRuleDirectivesInFile.js';

describe('replaceRuleDirectivesInFile', () => {
  const filePath = '/tmp/fake-path.ts';

  it('should replace multiple line comments', () => {
    const sourceText = `
        // eslint-disable no-debugger
        debugger;
        // eslint-disable no-console -- description
        console.log('hello world');
        `;

    const newSourceText = replaceRuleDirectivesInFile(filePath, sourceText, {});

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

    const newSourceText = replaceRuleDirectivesInFile(filePath, sourceText, {});

    expect(newSourceText).toBe(`
        /* oxlint-disable no-debugger */
        debugger;
        /* oxlint-disable no-console -- description */
        console.log('hello world');
        `);
  });
});

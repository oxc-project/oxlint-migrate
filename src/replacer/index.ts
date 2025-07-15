import glob from 'tiny-glob';
import { readFileSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { type Comment, parseSync } from 'oxc-parser';
import { Options } from '../types.js';
import replaceRuleDirectiveComment from './replaceRuleDirectiveComment.js';

const getAllProjectFiles = (): Promise<string[]> => {
  return glob('**/*.{js,cjs,mjs,ts,cts,mts,vue,astro,svelte}', {
    absolute: true,
    filesOnly: true,
  });
};

const getAstCommentsFromFilepath = (
  absoluteFilePath: string,
  sourceText: string
): Comment[] => {
  const parserResult = parseSync(absoluteFilePath, sourceText);

  return parserResult.comments;
};

const getSourceText = (absoluteFilePath: string): string | undefined => {
  try {
    return readFileSync(absoluteFilePath, 'utf-8');
  } catch {
    return undefined;
  }
};

const writeSourceTextToFile = (
  absoluteFilePath: string,
  sourceText: string
): Promise<void> => {
  return writeFile(absoluteFilePath, sourceText);
};

export const replacer = async (options: Options): Promise<void> => {
  const files = await getAllProjectFiles();

  await Promise.all(
    files.map((file) => {
      let sourceText = getSourceText(file);

      if (!sourceText) {
        return;
      }

      const comments = getAstCommentsFromFilepath(file, sourceText);
      const replacements: { start: number; end: number; newValue: string }[] =
        [];

      for (const comment of comments) {
        const replacedStr = replaceRuleDirectiveComment(comment.value, options);

        // we got a new string, replace it in the source code
        if (replacedStr !== comment.value) {
          replacements.push({
            start: comment.start,
            end: comment.end,
            newValue: replacedStr,
          });
        }
      }

      if (replacements.length) {
        // Sort replacements in reverse order to avoid shifting offsets
        replacements.sort((a, b) => b.start - a.start);

        for (const { start, end, newValue } of replacements) {
          sourceText =
            sourceText.slice(0, start) + newValue + sourceText.slice(end);
        }

        return writeSourceTextToFile(file, sourceText);
      }

      return Promise.resolve();
    })
  );
};

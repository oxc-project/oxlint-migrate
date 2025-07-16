import { glob } from 'tinyglobby';
import { readFileSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { Options } from '../types.js';
import replaceCommentsInFile from './replaceCommentsInFile.js';

const getAllProjectFiles = (): Promise<string[]> => {
  return glob(
    [
      '**/*.{js,cjs,mjs,ts,cts,mts,vue,astro,svelte}',
      '!**/node_modules/**',
      '!**/build/**',
    ],
    {
      absolute: true,
    }
  );
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
  return writeFile(absoluteFilePath, sourceText, 'utf-8');
};

export const walkAndReplaceProjectFiles = async (
  options: Options
): Promise<void> => {
  const files = await getAllProjectFiles();

  await Promise.all(
    files.map((file): Promise<void> | undefined => {
      let sourceText = getSourceText(file);

      if (!sourceText) {
        return;
      }

      const newSourceText = replaceCommentsInFile(file, sourceText, options);

      if (newSourceText === sourceText) {
        return;
      }

      return writeSourceTextToFile(file, newSourceText);
    })
  );
};

import { readFileSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { Options } from '../types.js';
import replaceCommentsInFile from './replaceCommentsInFile.js';

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

export const walkAndReplaceProjectFiles = (
  projectFiles: string[],
  options: Options
): Promise<void[]> => {
  return Promise.all(
    projectFiles.map((file): Promise<void> => {
      let sourceText = getSourceText(file);

      if (!sourceText) {
        return Promise.resolve();
      }

      const newSourceText = replaceCommentsInFile(file, sourceText, options);

      if (newSourceText === sourceText) {
        return Promise.resolve();
      }

      return writeSourceTextToFile(file, newSourceText);
    })
  );
};

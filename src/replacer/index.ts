import glob from 'tiny-glob';
import { readFileSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { Options } from '../types.js';
import replaceRuleDirectivesInFile from './replaceRuleDirectivesInFile.js';

const getAllProjectFiles = (): Promise<string[]> => {
  return glob('**/*.{js,cjs,mjs,ts,cts,mts,vue,astro,svelte}', {
    absolute: true,
    filesOnly: true,
  });
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

export const replaceRuleDirectives = async (
  options: Options
): Promise<void> => {
  const files = await getAllProjectFiles();

  await Promise.all(
    files.map((file): Promise<void> => {
      let sourceText = getSourceText(file);

      if (!sourceText) {
        return Promise.resolve();
      }

      const newSourceText = replaceRuleDirectivesInFile(
        file,
        sourceText,
        options
      );

      if (newSourceText === sourceText) {
        return Promise.resolve();
      }

      return writeSourceTextToFile(file, newSourceText);
    })
  );
};

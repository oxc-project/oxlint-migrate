import { Options } from '../types.js';
import replaceCommentsInFile from './replaceCommentsInFile.js';

export const walkAndReplaceProjectFiles = (
  /** all projects files to check */
  projectFiles: string[],
  /** function for reading the file */
  readFileSync: (filePath: string) => string | undefined,
  /** function for writing the file */
  writeFile: (filePath: string, content: string) => Promise<void>,
  /** options for the walker, for `reporter` and `withNurseryRules` */
  options: Options
): Promise<void[]> => {
  return Promise.all(
    projectFiles.map((file): Promise<void> => {
      const sourceText = readFileSync(file);

      if (!sourceText) {
        return Promise.resolve();
      }

      const newSourceText = replaceCommentsInFile(file, sourceText, options);

      if (newSourceText === sourceText) {
        return Promise.resolve();
      }

      return writeFile(file, newSourceText);
    })
  );
};

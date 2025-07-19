import { type Comment, parseSync } from 'oxc-parser';
import { Options } from '../types.js';
import replaceComments from './comments/index.js';
import partialSourceTextLoader from './partialSourceTextLoader.js';

const getComments = (
  absoluteFilePath: string,
  sourceText: string
): Comment[] => {
  const parserResult = parseSync(absoluteFilePath, sourceText);

  return parserResult.comments;
};

function replaceCommentsInSourceText(
  absoluteFilePath: string,
  sourceText: string,
  sourceTextOffset: number,
  options: Options
): string {
  const comments = getComments(absoluteFilePath, sourceText);

  for (const comment of comments) {
    try {
      const replacedStr = replaceComments(comment.value, comment.type, options);
      // we got a new string, replace it in the source code
      if (replacedStr !== comment.value) {
        // we know that the length of the comment will not change,
        // no need to sort them in reversed order to avoid shifting offsets.
        const newComment =
          comment.type === 'Line' ? `//${replacedStr}` : `/*${replacedStr}*/`;
        sourceText =
          sourceText.slice(0, comment.start) +
          newComment +
          sourceText.slice(comment.end);
      }
    } catch (error: unknown) {
      if (error instanceof Error && options.reporter) {
        options.reporter(
          `${absoluteFilePath}, char offset ${comment.start + sourceTextOffset}: ${error.message}`
        );
        continue;
      }
      throw error;
    }
  }

  return sourceText;
}

export default function replaceCommentsInFile(
  absoluteFilePath: string,
  fileContent: string,
  options: Options
): string {
  for (const { sourceText, offset } of partialSourceTextLoader(
    absoluteFilePath,
    fileContent
  )) {
    const newSourceText = replaceCommentsInSourceText(
      absoluteFilePath,
      sourceText,
      offset,
      options
    );

    if (newSourceText !== sourceText) {
      fileContent =
        fileContent.slice(0, offset) +
        newSourceText +
        fileContent.slice(offset + sourceText.length);
    }
  }

  return fileContent;
}

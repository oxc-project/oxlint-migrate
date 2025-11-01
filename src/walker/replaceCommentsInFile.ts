import { type Comment, parseSync } from 'oxc-parser';
import { Options } from '../types.js';
import replaceComments from './comments/index.js';
import partialSourceTextLoader, {
  PartialSourceText,
} from './partialSourceTextLoader.js';

const getComments = (
  absoluteFilePath: string,
  partialSourceText: PartialSourceText,
  options: Pick<Options, 'reporter'>
): Comment[] => {
  const parserResult = parseSync(
    absoluteFilePath,
    partialSourceText.sourceText,
    {
      lang: partialSourceText.lang,
      sourceType: partialSourceText.sourceType,
    }
  );

  if (parserResult.errors.length > 0) {
    options.reporter?.failedToParse(absoluteFilePath);
    return [];
  }

  return parserResult.comments;
};

function replaceCommentsInSourceText(
  absoluteFilePath: string,
  partialSourceText: PartialSourceText,
  options: Options
): string {
  const comments = getComments(absoluteFilePath, partialSourceText, options);
  let sourceText = partialSourceText.sourceText;

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
      if (error instanceof Error) {
        options.reporter?.report(
          `${absoluteFilePath}, char offset ${comment.start + partialSourceText.offset}: ${error.message}`
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
  for (const partialSourceText of partialSourceTextLoader(
    absoluteFilePath,
    fileContent
  )) {
    const newSourceText = replaceCommentsInSourceText(
      absoluteFilePath,
      partialSourceText,
      options
    );

    if (newSourceText !== partialSourceText.sourceText) {
      fileContent =
        fileContent.slice(0, partialSourceText.offset) +
        newSourceText +
        fileContent.slice(
          partialSourceText.offset + partialSourceText.sourceText.length
        );
    }
  }

  return fileContent;
}

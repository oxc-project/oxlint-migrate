import { type Comment, parseSync } from 'oxc-parser';
import { Options } from '../types.js';
import replaceRuleDirectiveComment from './replaceRuleDirectiveComment.js';

const getComments = (
  absoluteFilePath: string,
  sourceText: string
): Comment[] => {
  const parserResult = parseSync(absoluteFilePath, sourceText);

  return parserResult.comments;
};

export default function replaceRuleDirectivesInFile(
  absoluteFilePath: string,
  sourceText: string,
  options: Options
): string {
  const comments = getComments(absoluteFilePath, sourceText);

  for (const comment of comments) {
    const replacedStr = replaceRuleDirectiveComment(comment.value, options);

    // we got a new string, replace it in the source code
    if (replacedStr !== comment.value) {
      // we know that the length of the comment will not change,
      // no need to sort them in reversed order to avoid shifting offsets.
      // ToDo: validate that with different comment line breaks and leading line breaks
      const newComment =
        comment.type === 'Line' ? `//${replacedStr}` : `/*${replacedStr}*/`;
      sourceText =
        sourceText.slice(0, comment.start) +
        newComment +
        sourceText.slice(comment.end);
    }
  }

  return sourceText;
}

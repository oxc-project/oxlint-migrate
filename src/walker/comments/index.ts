import { Options } from '../../types.js';
import replaceRuleDirectiveComment from './replaceRuleDirectiveComment.js';

export default function replaceComments(
  comment: string,
  options: Options
): string {
  const originalComment = comment;
  comment = comment.trim();

  // eslint-disable or eslint-enable
  if (comment.startsWith('eslint-')) {
    return replaceRuleDirectiveComment(originalComment, options);
  } else if (comment.startsWith('eslint ')) {
    throw new Error(
      'changing eslint rules with inline comment is not supported'
    );
  } else if (comment.startsWith('global')) {
    throw new Error('changing globals with inline comment is not supported');
  }

  return originalComment;
}

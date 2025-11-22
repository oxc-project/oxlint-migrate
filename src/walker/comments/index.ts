import { Options } from '../../types.js';
import replaceRuleDirectiveComment from './replaceRuleDirectiveComment.js';

export default function replaceComments(
  comment: string,
  type: 'Line' | 'Block',
  options: Options
): string {
  const originalComment = comment;
  comment = comment.trim(); // trim the end too, so we can check for standalone "eslint" comments

  // "eslint-disable" or "eslint-enable"
  if (comment.startsWith('eslint-')) {
    return replaceRuleDirectiveComment(originalComment, type, options);
  } else if (type === 'Block') {
    // these eslint comments are only valid in block comments

    if (comment.startsWith('eslint ')) {
      // we do not check for supported rules, we just inform the user about the missing support
      throw new Error(
        'changing eslint rules with inline comment is not supported'
      );
    } else if (comment.startsWith('global ')) {
      // we do not check for supported globals, we just inform the user about the missing support
      throw new Error('changing globals with inline comment is not supported');
    }
  }

  return originalComment;
}

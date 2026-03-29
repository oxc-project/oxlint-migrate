import * as rules from '../../generated/rules.js';
import { normalizeRuleToCanonical } from '../../constants.js';
import { Options } from '../../types.js';

const allRulesSet = new Set(Object.values(rules).flat());
const nurseryRulesSet = new Set(rules.nurseryRules);

export default function replaceRuleDirectiveComment(
  comment: string,
  type: 'Line' | 'Block',
  options: Options
): string {
  const originalComment = comment;
  // "--" is a separator for describing the directive
  comment = comment.split(' -- ')[0].trimStart();

  // this is not an eslint comment
  if (!comment.startsWith('eslint-')) {
    return originalComment;
  }

  comment = comment.substring(7); // "eslint-" is 7 chars long

  if (comment.startsWith('enable')) {
    comment = comment.substring(6);
  } else if (comment.startsWith('disable')) {
    comment = comment.substring(7);

    if (type === 'Line') {
      if (comment.startsWith('-next-line')) {
        comment = comment.substring(10);
      } else if (comment.startsWith('-line')) {
        comment = comment.substring(5);
      }
    }
  } else {
    // "eslint-" needs to follow up with "disable" or "enable"
    return originalComment;
  }

  // next char must be a space
  if (!comment.startsWith(' ')) {
    return originalComment;
  }

  comment = comment.trimStart();

  if (comment.length === 0) {
    return originalComment;
  }

  while (comment.length) {
    // Extract the candidate rule name: everything up to ', ' or end of string
    const commaIdx = comment.indexOf(',');
    const candidateEnd = commaIdx === -1 ? comment.length : commaIdx;
    const candidate = comment.substring(0, candidateEnd).trimEnd();

    const canonical = normalizeRuleToCanonical(candidate);

    if (!allRulesSet.has(canonical)) {
      return originalComment;
    }

    // skip nursery rules when not enabled
    if (!options.withNursery && nurseryRulesSet.has(canonical)) {
      return originalComment;
    }

    comment = comment.substring(candidate.length).trimStart();

    // we reached the end of the comment
    if (!comment.length) {
      break;
    }

    // when the comment is not empty, we expect a next rule, separated with a comma
    if (!comment.startsWith(', ')) {
      return originalComment;
    }

    // remove comma and all whitespaces that follows
    comment = comment.substring(1).trimStart();
  }

  // only the replace the first entry, spaces can be before the comment
  return originalComment.replace(/eslint-/, 'oxlint-');
}

import { globSync } from 'fast-glob';
import { readFileSync } from 'node:fs';
import { type Comment, parseSync } from 'oxc-parser';
import * as rules from '../generated/rules.js';

const allRules = Object.values(rules).flat();

const getAllProjectFiles = (): string[] => {
  return globSync(['**/*.{js,cjs,mjs,ts,cts,mts,vue,astro,svelte}'], {
    absolute: true,
  });
};

const getAstCommentsFromFilepath = (absoluteFilepath: string): Comment[] => {
  const content = readFileSync(absoluteFilepath, 'utf-8');
  const parserResult = parseSync(absoluteFilepath, content);

  return parserResult.comments;
};

export const replaceRuleDirectiveComment = (comment: string): string => {
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

    // eslint-disable-next-line and eslint-disable-line
    comment = comment.replace(/^-next/, '').replace(/^-line/, '');
    // "eslint-" needs to follow up with "disable" or "enable"
  } else {
    return originalComment;
  }

  // next char must be a space
  if (!comment.startsWith(' ')) {
    return originalComment;
  }

  comment = comment.trimStart();

  while (comment.length) {
    let foundRule = false;
    // ToDo check for nursery rules
    for (const rule of allRules) {
      if (comment.startsWith(rule)) {
        foundRule = true;
        comment = comment.substring(rule.length).trimStart();
        break;
      }
    }

    if (!foundRule) {
      return originalComment;
    }

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
};

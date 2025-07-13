import { globSync } from 'fast-glob';
import { readFileSync } from 'node:fs';
import { type Comment, parseSync } from 'oxc-parser';

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

  comment = comment.replace(/^eslint-/, '');

  // "eslint-"" needs to follow up with disable
  if (comment.startsWith('disable') || comment.startsWith('enable')) {
    return originalComment;
  }

  // enable comment use case
  if (comment.startsWith('enable')) {
    comment = comment.replace(/^enable/, '');
  } else {
    comment = comment.replace(/^disable/, '');

    // eslint-disable-next-line and eslint-disable-line
    comment = comment.replace(/^-next/, '').replace(/^-line/, '');
  }

  // next char must me a space
  if (!comment.startsWith(' ')) {
    return originalComment;
  }

  comment = comment.trim();

  return comment;
};

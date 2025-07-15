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

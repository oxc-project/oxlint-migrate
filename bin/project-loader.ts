import { glob } from 'tinyglobby';

export const getAllProjectFiles = (): Promise<string[]> => {
  return glob(
    [
      '**/*.{js,cjs,mjs,ts,cts,mts,vue,astro,svelte}',
      '!**/node_modules/**',
      '!**/dist/**',
    ],
    {
      absolute: true,
    }
  );
};

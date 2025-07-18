import { describe, expect, it } from 'vitest';
import {
  partialAstroSourceTextLoader,
  partialSvelteSourceTextLoader,
  partialVueSourceTextLoader,
} from './partialSourceTextLoader.js';

/**
 * Tests copied from oxc:
 * @link https://github.com/oxc-project/oxc/blob/dfe54b44ff9815e793bf61a5dd966a146998d81a/crates/oxc_linter/src/loader/partial_loader/vue.rs
 */
describe('partialVueSourceTextLoader', () => {
  it('should parse simple script tag', () => {
    const sourceText = `
    <template><h1>hello world</h1></template>
    <script>debugger;</script>`;
    const result = partialVueSourceTextLoader(sourceText);

    expect(result).toStrictEqual([
      {
        sourceText: 'debugger;',
        offset: 59,
      },
    ]);
  });

  it('should parse generics script tag', () => {
    const sourceText = `
    <template><h1>hello world</h1></template>
    <script lang="ts" setup generic="T extends Record<string, string>">debugger;</script>`;
    const result = partialVueSourceTextLoader(sourceText);

    expect(result).toStrictEqual([
      {
        sourceText: 'debugger;',
        offset: 118,
      },
    ]);
  });

  it('should parse script tag with ">" inside attribute', () => {
    const sourceText = `
    <template><h1>hello world</h1></template>
    <script lang="ts" description="PI > 3">debugger;</script>`;
    const result = partialVueSourceTextLoader(sourceText);

    expect(result).toStrictEqual([
      {
        sourceText: 'debugger;',
        offset: 90,
      },
    ]);
  });

  it('should return empty array when no script found', () => {
    const sourceText = `<template><h1>hello world</h1></template>`;
    const result = partialVueSourceTextLoader(sourceText);

    expect(result).toStrictEqual([]);
  });

  it('should ignore script-like elements in template', () => {
    const sourceText = `
    <template><script-view /></template>
    <script setup>debugger;</script>`;
    const result = partialVueSourceTextLoader(sourceText);

    expect(result).toStrictEqual([
      {
        sourceText: 'debugger;',
        offset: 60,
      },
    ]);
  });

  it('should parse multiple script blocks', () => {
    const sourceText = `
    <template><h1>hello world!</h1></template>
    <script> export default {} </script>
    <script setup>debugger;</script>`;
    const result = partialVueSourceTextLoader(sourceText);

    expect(result).toStrictEqual([
      {
        sourceText: ' export default {} ',
        offset: 60,
      },
      {
        sourceText: 'debugger;',
        offset: 107,
      },
    ]);
  });
});

/**
 * Test copied from oxc:
 * @link https://github.com/oxc-project/oxc/blob/fea9df4228750a38a6a2c4cc418a42a35dfb6fb8/crates/oxc_linter/src/loader/partial_loader/svelte.rs
 */
describe('partialSvelteSourceTextLoader', () => {
  it('should parse simple script tag', () => {
    const sourceText = `
   <script>
     console.log("hi");
   </script>
   <h1>Hello World</h1>`;
    const result = partialSvelteSourceTextLoader(sourceText);
    expect(result).toStrictEqual([
      {
        sourceText: '\n     console.log("hi");\n   ',
        offset: 12,
      },
    ]);
  });

  it('should parse generics script tag', () => {
    const sourceText = `
    <script lang="ts" setup generic="T extends Record<string, string>">
      console.log("hi");
    </script>
    <h1>hello world</h1>`;
    const result = partialSvelteSourceTextLoader(sourceText);

    expect(result).toStrictEqual([
      {
        sourceText: '\n      console.log("hi");\n    ',
        offset: 72,
      },
    ]);
  });

  it('should parse both script tags (context module)', () => {
    const sourceText = `
    <script context="module">
      export const foo = 'bar';
    </script>
    <script>
      console.log("hi");
    </script>
    <h1>hello world</h1>`;
    const result = partialSvelteSourceTextLoader(sourceText);
    expect(result).toStrictEqual([
      {
        sourceText: "\n      export const foo = 'bar';\n    ",
        offset: 30,
      },
      {
        sourceText: '\n      console.log("hi");\n    ',
        offset: 89,
      },
    ]);
  });
});

/**
 * Test copied from oxc:
 * @link https://github.com/oxc-project/oxc/blob/fea9df4228750a38a6a2c4cc418a42a35dfb6fb8/crates/oxc_linter/src/loader/partial_loader/astro.rs
 */
describe('partialAstroSourceTextLoader', () => {
  it('should parse simple script tag', () => {
    const sourceText = `
    <h1>Welcome, world!</h1>
    <script>console.log("Hi");</script>`;
    const result = partialAstroSourceTextLoader(sourceText);
    expect(result).toStrictEqual([
      {
        sourceText: 'console.log("Hi");',
        offset: 42,
      },
    ]);
  });

  it('should parse frontmatter', () => {
    const sourceText = `
    ---
    const { message = 'Welcome, world!' } = Astro.props;
    ---

    <h1>Welcome, world!</h1>

    <script>
      console.log("Hi");
    </script>`;
    const result = partialAstroSourceTextLoader(sourceText);
    expect(result).toStrictEqual([
      {
        sourceText:
          "\n    const { message = 'Welcome, world!' } = Astro.props;\n    ",
        offset: 8,
      },
      {
        sourceText: '\n      console.log("Hi");\n    ',
        offset: 117,
      },
    ]);
  });

  it('should parse with inline script', () => {
    const sourceText = `
    <h1>Welcome, world!</h1>

    <script is:inline src="https://my-analytics.com/script.js"></script>

    <script>
      console.log("Hi");
    </script>`;

    const result = partialAstroSourceTextLoader(sourceText);
    expect(result).toStrictEqual([
      {
        sourceText: '',
        offset: 94,
      },
      {
        sourceText: '\n      console.log("Hi");\n    ',
        offset: 117,
      },
    ]);
  });

  it('should parse with self closing script tag', () => {
    const sourceText = `
      <h1>Welcome, world!</h1>

      <script is:inline src="https://my-analytics.com/script.js" />

      <script>
        console.log("Hi");
      </script>`;

    const result = partialAstroSourceTextLoader(sourceText);
    expect(result).toStrictEqual([
      {
        sourceText: '\n        console.log("Hi");\n      ',
        offset: 116,
      },
    ]);
  });
});

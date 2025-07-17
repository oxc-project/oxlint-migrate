import { describe, expect, it } from 'vitest';
import { partialVueSourceTextLoader } from './partialSourceTextLoader.js';

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

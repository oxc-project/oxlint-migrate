import { describe, expect, test } from 'vitest';
import migrateConfig from './index.js';
import { DefaultReporter } from './reporter.js';
import type { ESLint } from './types.js';

const nextPlugin: ESLint.Plugin = {
  meta: { name: '@next/eslint-plugin-next' },
  rules: {
    'no-img-element': 'error',
    'no-location-assign-relative-destination': 'error',
  },
};

describe('JavaScript fallback for missing native plugin rules', () => {
  test('warns about custom parser coverage without dropping JS plugin rules', async () => {
    const reporter = new DefaultReporter();
    const config = await migrateConfig(
      [
        {
          files: ['**/*.svelte'],
          languageOptions: {
            parser: { meta: { name: 'svelte-eslint-parser' } },
          },
          plugins: {
            svelte: {
              meta: { name: 'eslint-plugin-svelte' },
              rules: { 'no-at-html-tags': {} },
            },
          },
          rules: { 'svelte/no-at-html-tags': 'error' },
        },
      ],
      undefined,
      { jsPlugins: true, reporter }
    );

    expect(config.overrides?.[0].rules?.['svelte/no-at-html-tags']).toBe(
      'error'
    );
    expect(reporter.getWarnings()).toEqual([
      expect.stringContaining('svelte-eslint-parser'),
    ]);
  });

  test('warns when plugin metadata marks a rule as type-aware', async () => {
    const reporter = new DefaultReporter();
    const config = await migrateConfig(
      [
        {
          plugins: {
            example: {
              meta: { name: 'eslint-plugin-example' },
              rules: {
                'needs-types': {
                  meta: { docs: { requiresTypeChecking: true } },
                },
                'plain-rule': { meta: { docs: {} } },
              },
            },
          },
          rules: {
            'example/needs-types': 'error',
            'example/plain-rule': 'warn',
          },
        },
      ],
      undefined,
      { jsPlugins: true, reporter }
    );

    expect(config.rules?.['example/needs-types']).toBe('error');
    expect(config.rules?.['example/plain-rule']).toBe('warn');
    expect(reporter.getWarnings()).toEqual([
      expect.stringContaining('example/needs-types requires type information'),
    ]);
  });

  test('keeps native rules and aliases missing rules from the same plugin', async () => {
    const reporter = new DefaultReporter();
    const config = await migrateConfig(
      [
        {
          plugins: { '@next/next': nextPlugin },
          rules: {
            '@next/next/no-img-element': 'error',
            '@next/next/no-location-assign-relative-destination': [
              'warn',
              { example: true },
            ],
          },
        },
      ],
      undefined,
      { jsPlugins: true, reporter }
    );

    expect(config.plugins).toContain('nextjs');
    expect(config.rules?.['nextjs/no-img-element']).toBe('error');
    expect(config.jsPlugins).toEqual([
      { name: 'nextjs-js', specifier: '@next/eslint-plugin-next' },
    ]);
    expect(
      config.rules?.['nextjs-js/no-location-assign-relative-destination']
    ).toEqual(['warn', { example: true }]);
    expect(reporter.getSkippedRulesByCategory()['not-implemented']).toEqual([]);
  });

  test('keeps React and React Hooks fallbacks distinct', async () => {
    const config = await migrateConfig(
      [
        {
          plugins: {
            react: {
              meta: { name: 'eslint-plugin-react' },
              rules: { 'no-deprecated': 'error' },
            },
            'react-hooks': {
              meta: { name: 'eslint-plugin-react-hooks' },
              rules: { config: 'error' },
            },
          },
          rules: {
            'react/no-deprecated': 'warn',
            'react-hooks/config': 'error',
          },
        },
      ],
      undefined,
      { jsPlugins: true }
    );

    expect(config.jsPlugins).toEqual([
      { name: 'react-js', specifier: 'eslint-plugin-react' },
      { name: 'react-hooks-js', specifier: 'eslint-plugin-react-hooks' },
    ]);
    expect(config.rules?.['react-js/no-deprecated']).toBe('warn');
    expect(config.rules?.['react-hooks-js/config']).toBe('error');
  });

  test('retains rule options when a later config only changes severity', async () => {
    const config = await migrateConfig(
      [
        {
          plugins: { '@next/next': nextPlugin },
          rules: {
            '@next/next/no-location-assign-relative-destination': [
              'warn',
              { example: true },
            ],
          },
        },
        {
          rules: {
            '@next/next/no-location-assign-relative-destination': 'error',
          },
        },
      ],
      undefined,
      { jsPlugins: true }
    );

    expect(
      config.rules?.['nextjs-js/no-location-assign-relative-destination']
    ).toEqual(['error', { example: true }]);
    expect(config.jsPlugins).toEqual([
      { name: 'nextjs-js', specifier: '@next/eslint-plugin-next' },
    ]);
  });

  test('does not guess a fallback when no ESLint plugin provides the rule', async () => {
    const reporter = new DefaultReporter();
    const config = await migrateConfig(
      [
        {
          rules: {
            '@next/next/no-location-assign-relative-destination': 'warn',
          },
        },
      ],
      undefined,
      { jsPlugins: true, reporter }
    );

    expect(config.jsPlugins).toBeUndefined();
    expect(
      config.rules?.['nextjs-js/no-location-assign-relative-destination']
    ).toBeUndefined();
    expect(reporter.getSkippedRulesByCategory()['not-implemented']).toEqual([
      '@next/next/no-location-assign-relative-destination',
    ]);
  });

  test('preserves an override that disables a fallback rule', async () => {
    const config = await migrateConfig(
      [
        {
          plugins: { '@next/next': nextPlugin },
          rules: {
            '@next/next/no-location-assign-relative-destination': 'warn',
          },
        },
        {
          files: ['**/*.js'],
          rules: {
            '@next/next/no-location-assign-relative-destination': 'off',
          },
        },
      ],
      undefined,
      { jsPlugins: true }
    );

    expect(
      config.rules?.['nextjs-js/no-location-assign-relative-destination']
    ).toBe('warn');
    expect(config.overrides?.[0].jsPlugins).toEqual([
      { name: 'nextjs-js', specifier: '@next/eslint-plugin-next' },
    ]);
    expect(
      config.overrides?.[0].rules?.[
        'nextjs-js/no-location-assign-relative-destination'
      ]
    ).toBe('off');
  });

  test('removes a fallback from an earlier override when a later base config disables it', async () => {
    const config = await migrateConfig(
      [
        {
          files: ['**/*.js'],
          plugins: { '@next/next': nextPlugin },
          rules: {
            '@next/next/no-location-assign-relative-destination': 'warn',
          },
        },
        {
          rules: {
            '@next/next/no-location-assign-relative-destination': 'off',
          },
        },
      ],
      undefined,
      { jsPlugins: true }
    );

    expect(config.overrides).toBeUndefined();
  });
});

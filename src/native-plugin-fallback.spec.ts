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

import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import main from './index.js';
import { DefaultReporter } from './reporter.js';
import type { ESLint } from './types.js';

describe('React Refresh option migration', () => {
  test('keeps the workaround tied to the supported Oxlint options', () => {
    const schema = JSON.parse(
      readFileSync(
        new URL(
          'configuration_schema.json',
          import.meta.resolve('oxlint/package.json')
        ),
        'utf8'
      )
    );
    // Once Oxlint supports this option, remove the workaround and preserve it.
    expect(
      schema.definitions.OnlyExportComponentsConfig.properties
    ).not.toHaveProperty('allowCompoundComponents');
  });

  test.each([
    ['react-refresh/only-export-components', true],
    ['react-refresh/only-export-components', false],
    ['react/only-export-components', true],
    ['react/only-export-components', false],
  ] as const)(
    'removes %s.allowCompoundComponents=%s from root and override rules',
    async (rule, value) => {
      const configs: ESLint.Config[] = [
        {
          rules: {
            [rule]: [
              'warn',
              {
                allowCompoundComponents: value,
                allowConstantExport: true,
                allowExportNames: ['loader'],
                customHOCs: ['observer'],
                checkJS: true,
              },
            ],
          },
        },
        {
          files: ['**/*.tsx'],
          rules: { [rule]: ['error', { allowCompoundComponents: value }] },
        },
      ];
      const original = structuredClone(configs);
      const reporter = new DefaultReporter();

      const result = await main(configs, undefined, { reporter });

      expect(result.rules?.['react/only-export-components']).toStrictEqual([
        'warn',
        {
          allowConstantExport: true,
          allowExportNames: ['loader'],
          customHOCs: ['observer'],
          checkJS: true,
        },
      ]);
      expect(
        result.overrides?.[0].rules?.['react/only-export-components']
      ).toStrictEqual(['error', {}]);
      expect(configs).toStrictEqual(original);
      expect(reporter.getWarnings()).toStrictEqual([
        'Removed unsupported option `allowCompoundComponents` from `react/only-export-components`. ' +
          'Compound component exports may now report lint errors.',
      ]);
    }
  );

  test('preserves an existing Oxlint rule when merging without a warning', async () => {
    const reporter = new DefaultReporter();
    const result = await main(
      {
        rules: {
          'react/only-export-components': [
            'error',
            { allowCompoundComponents: true },
          ],
        },
      },
      {
        rules: {
          'react/only-export-components': ['warn', { checkJS: true }],
        },
      },
      { merge: true, reporter }
    );

    expect(result.rules?.['react/only-export-components']).toStrictEqual([
      'warn',
      { checkJS: true },
    ]);
    expect(reporter.getWarnings()).toStrictEqual([]);
  });

  test('preserves supported options and severity-only entries', async () => {
    const reporter = new DefaultReporter();
    const result = await main(
      [
        {
          rules: {
            'react-refresh/only-export-components': [
              'error',
              { allowConstantExport: true },
            ],
          },
        },
        {
          files: ['**/*.jsx'],
          rules: { 'react-refresh/only-export-components': ['warn'] },
        },
        {
          files: ['**/*.js'],
          rules: { 'react-refresh/only-export-components': 'off' },
        },
      ],
      undefined,
      { reporter }
    );

    expect(result.rules?.['react/only-export-components']).toStrictEqual([
      'error',
      { allowConstantExport: true },
    ]);
    expect(
      result.overrides?.[0].rules?.['react/only-export-components']
    ).toStrictEqual(['warn', { allowConstantExport: true }]);
    expect(result.overrides?.[1].rules?.['react/only-export-components']).toBe(
      'off'
    );
    expect(reporter.getWarnings()).toStrictEqual([]);
  });

  test('removes the option from a disabled override without a warning', async () => {
    const reporter = new DefaultReporter();
    const result = await main(
      {
        files: ['**/*.jsx'],
        rules: {
          'react-refresh/only-export-components': [
            'off',
            { allowCompoundComponents: true },
          ],
        },
      },
      undefined,
      { reporter }
    );

    expect(
      result.overrides?.[0].rules?.['react/only-export-components']
    ).toStrictEqual(['off', {}]);
    expect(reporter.getWarnings()).toStrictEqual([]);
  });
});

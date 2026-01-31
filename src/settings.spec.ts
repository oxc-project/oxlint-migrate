import { describe, it, expect } from 'vitest';
import { transformSettings, warnSettingsInOverride } from './settings.js';
import type { Linter } from 'eslint';
import { OxlintConfig, OXLINT_SUPPORTED_SETTINGS_KEYS } from './types.js';
import { DefaultReporter } from './reporter.js';

describe('transformSettings', () => {
  describe('basic functionality', () => {
    it('should not modify config when no settings present', () => {
      const eslintConfig: Linter.Config = {};
      const targetConfig: OxlintConfig = {};

      transformSettings(eslintConfig, targetConfig);

      expect(targetConfig.settings).toBeUndefined();
    });

    it('should not modify config when settings is null', () => {
      const eslintConfig: Linter.Config = {
        settings: null as unknown as Record<string, unknown>,
      };
      const targetConfig: OxlintConfig = {};

      transformSettings(eslintConfig, targetConfig);

      expect(targetConfig.settings).toBeUndefined();
    });

    it('should not modify config when settings is empty object', () => {
      const eslintConfig: Linter.Config = { settings: {} };
      const targetConfig: OxlintConfig = {};

      transformSettings(eslintConfig, targetConfig);

      expect(targetConfig.settings).toBeUndefined();
    });
  });

  describe('supported settings keys', () => {
    it('should migrate jsx-a11y settings', () => {
      const eslintConfig: Linter.Config = {
        settings: {
          'jsx-a11y': {
            polymorphicPropName: 'role',
            components: { Link: 'a' },
          },
        },
      };
      const targetConfig: OxlintConfig = {};

      transformSettings(eslintConfig, targetConfig);

      expect(targetConfig.settings).toEqual({
        'jsx-a11y': {
          polymorphicPropName: 'role',
          components: { Link: 'a' },
        },
      });
    });

    it('should migrate react settings', () => {
      const eslintConfig: Linter.Config = {
        settings: {
          react: {
            version: '18.2.0',
            linkComponents: ['Hyperlink'],
          },
        },
      };
      const targetConfig: OxlintConfig = {};

      transformSettings(eslintConfig, targetConfig);

      expect(targetConfig.settings).toEqual({
        react: {
          version: '18.2.0',
          linkComponents: ['Hyperlink'],
        },
      });
    });

    it('should migrate next settings', () => {
      const eslintConfig: Linter.Config = {
        settings: {
          next: {
            rootDir: 'apps/dashboard/',
          },
        },
      };
      const targetConfig: OxlintConfig = {};

      transformSettings(eslintConfig, targetConfig);

      expect(targetConfig.settings).toEqual({
        next: {
          rootDir: 'apps/dashboard/',
        },
      });
    });

    it('should migrate jsdoc settings', () => {
      const eslintConfig: Linter.Config = {
        settings: {
          jsdoc: {
            ignorePrivate: true,
            tagNamePreference: { foo: 'bar' },
          },
        },
      };
      const targetConfig: OxlintConfig = {};

      transformSettings(eslintConfig, targetConfig);

      expect(targetConfig.settings).toEqual({
        jsdoc: {
          ignorePrivate: true,
          tagNamePreference: { foo: 'bar' },
        },
      });
    });

    it('should migrate vitest settings', () => {
      const eslintConfig: Linter.Config = {
        settings: {
          vitest: {
            typecheck: true,
          },
        },
      };
      const targetConfig: OxlintConfig = {};

      transformSettings(eslintConfig, targetConfig);

      expect(targetConfig.settings).toEqual({
        vitest: {
          typecheck: true,
        },
      });
    });

    it('should migrate multiple supported settings', () => {
      const eslintConfig: Linter.Config = {
        settings: {
          react: { version: '18.0.0' },
          'jsx-a11y': { polymorphicPropName: 'as' },
          vitest: { typecheck: true },
        },
      };
      const targetConfig: OxlintConfig = {};

      transformSettings(eslintConfig, targetConfig);

      expect(targetConfig.settings).toEqual({
        react: { version: '18.0.0' },
        'jsx-a11y': { polymorphicPropName: 'as' },
        vitest: { typecheck: true },
      });
    });
  });

  describe('unsupported settings filtering', () => {
    it('should skip unsupported settings and warn', () => {
      const reporter = new DefaultReporter();
      const eslintConfig: Linter.Config = {
        settings: {
          react: { version: '18.0.0' },
          'import/resolver': { typescript: true },
          'custom-plugin': { foo: 'bar' },
        },
      };
      const targetConfig: OxlintConfig = {};

      transformSettings(eslintConfig, targetConfig, { reporter });

      expect(targetConfig.settings).toEqual({
        react: { version: '18.0.0' },
      });
      const warnings = reporter.getWarnings();
      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toContain('import/resolver');
      expect(warnings[0]).toContain('custom-plugin');
      expect(warnings[0]).toContain('not supported by oxlint');
    });

    it('should skip non-object settings values', () => {
      const reporter = new DefaultReporter();
      const eslintConfig: Linter.Config = {
        settings: {
          react: { version: '18.0.0' },
          'string-setting': 'value' as unknown as Record<string, unknown>,
          'number-setting': 123 as unknown as Record<string, unknown>,
        },
      };
      const targetConfig: OxlintConfig = {};

      transformSettings(eslintConfig, targetConfig, { reporter });

      expect(targetConfig.settings).toEqual({
        react: { version: '18.0.0' },
      });
      const warnings = reporter.getWarnings();
      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toContain('string-setting');
      expect(warnings[0]).toContain('number-setting');
    });
  });

  describe('jsPlugins mode does not affect settings', () => {
    it('should still only migrate supported settings when jsPlugins is enabled', () => {
      const reporter = new DefaultReporter();
      const eslintConfig: Linter.Config = {
        settings: {
          react: { version: '18.0.0' },
          'import/resolver': { typescript: true },
          'custom-plugin': { foo: 'bar' },
        },
      };
      const targetConfig: OxlintConfig = {};

      transformSettings(eslintConfig, targetConfig, {
        reporter,
        jsPlugins: true,
      });

      expect(targetConfig.settings).toEqual({
        react: { version: '18.0.0' },
      });
      // Should still warn about unsupported settings
      const warnings = reporter.getWarnings();
      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toContain('import/resolver');
      expect(warnings[0]).toContain('custom-plugin');
    });
  });

  describe('merge mode', () => {
    it('should merge settings with existing config', () => {
      const eslintConfig: Linter.Config = {
        settings: {
          react: { version: '18.0.0', linkComponents: ['Link'] },
        },
      };
      const targetConfig: OxlintConfig = {
        settings: {
          react: { formComponents: ['Form'] },
        },
      };

      transformSettings(eslintConfig, targetConfig, { merge: true });

      expect(targetConfig.settings).toEqual({
        react: {
          version: '18.0.0',
          linkComponents: ['Link'],
          formComponents: ['Form'],
        },
      });
    });

    it('should deep merge nested settings objects', () => {
      const eslintConfig: Linter.Config = {
        settings: {
          'jsx-a11y': {
            components: { Link: 'a', Button: 'button' },
          },
        },
      };
      const targetConfig: OxlintConfig = {
        settings: {
          'jsx-a11y': {
            components: { IconButton: 'button' },
            polymorphicPropName: 'as',
          },
        },
      };

      transformSettings(eslintConfig, targetConfig, { merge: true });

      expect(targetConfig.settings).toEqual({
        'jsx-a11y': {
          components: { Link: 'a', Button: 'button', IconButton: 'button' },
          polymorphicPropName: 'as',
        },
      });
    });

    it('should add new settings keys when merging', () => {
      const eslintConfig: Linter.Config = {
        settings: {
          vitest: { typecheck: true },
        },
      };
      const targetConfig: OxlintConfig = {
        settings: {
          react: { version: '18.0.0' },
        },
      };

      transformSettings(eslintConfig, targetConfig, { merge: true });

      expect(targetConfig.settings).toEqual({
        react: { version: '18.0.0' },
        vitest: { typecheck: true },
      });
    });

    it('should replace arrays when merging', () => {
      const eslintConfig: Linter.Config = {
        settings: {
          react: { linkComponents: ['NewLink', 'CustomLink'] },
        },
      };
      const targetConfig: OxlintConfig = {
        settings: {
          react: { linkComponents: ['OldLink'] },
        },
      };

      transformSettings(eslintConfig, targetConfig, { merge: true });

      expect(targetConfig.settings).toEqual({
        react: { linkComponents: ['NewLink', 'CustomLink'] },
      });
    });
  });
});

describe('warnSettingsInOverride', () => {
  it('should warn when settings are found in override config', () => {
    const reporter = new DefaultReporter();
    const eslintConfig: Linter.Config = {
      files: ['**/*.tsx'],
      settings: {
        react: { version: '18.0.0' },
        'jsx-a11y': { polymorphicPropName: 'as' },
      },
    };

    warnSettingsInOverride(eslintConfig, { reporter });

    const warnings = reporter.getWarnings();
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('react');
    expect(warnings[0]).toContain('jsx-a11y');
    expect(warnings[0]).toContain('does not support settings in overrides');
  });

  it('should not warn when no settings in override config', () => {
    const reporter = new DefaultReporter();
    const eslintConfig: Linter.Config = {
      files: ['**/*.tsx'],
    };

    warnSettingsInOverride(eslintConfig, { reporter });

    expect(reporter.getWarnings()).toHaveLength(0);
  });

  it('should not warn when settings is empty', () => {
    const reporter = new DefaultReporter();
    const eslintConfig: Linter.Config = {
      files: ['**/*.tsx'],
      settings: {},
    };

    warnSettingsInOverride(eslintConfig, { reporter });

    expect(reporter.getWarnings()).toHaveLength(0);
  });
});

describe('OXLINT_SUPPORTED_SETTINGS_KEYS', () => {
  it('should contain the expected supported keys', () => {
    expect(OXLINT_SUPPORTED_SETTINGS_KEYS).toContain('jsx-a11y');
    expect(OXLINT_SUPPORTED_SETTINGS_KEYS).toContain('next');
    expect(OXLINT_SUPPORTED_SETTINGS_KEYS).toContain('react');
    expect(OXLINT_SUPPORTED_SETTINGS_KEYS).toContain('jsdoc');
    expect(OXLINT_SUPPORTED_SETTINGS_KEYS).toContain('vitest');
    expect(OXLINT_SUPPORTED_SETTINGS_KEYS).toHaveLength(5);
  });
});

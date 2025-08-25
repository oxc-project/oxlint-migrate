import { describe, expect, test } from 'vitest';
import fixForJsPlugins from './js_plugin_fixes.js';

describe('fixForJsPlugins', () => {
  test('should fix @antfu/eslint-config', () => {
    class TestConfig extends Promise<any> {
      public plugins: string[];
      constructor(plugins: string[]) {
        super(() => {});
        this.plugins = plugins;
      }
      renamePlugins(plugins: Record<string, string>) {
        this.plugins = this.plugins.map((plugin) => plugins[plugin] || plugin);
        return this;
      }
    }
    // Create an instance of TestConfig
    const config = new TestConfig(['ts', 'next', 'test']);

    void fixForJsPlugins(config);

    expect(config.plugins.length).toBe(3);
    expect(config.plugins).toStrictEqual([
      '@typescript-eslint',
      '@next/next',
      'vitest',
    ]);
  });
});

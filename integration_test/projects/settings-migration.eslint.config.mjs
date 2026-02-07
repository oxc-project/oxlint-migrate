import reactPlugin from 'eslint-plugin-react';

export default [
  {
    plugins: {
      react: reactPlugin,
    },
    settings: {
      // Supported: react settings
      react: {
        version: '18.2.0',
        linkComponents: ['Hyperlink', { name: 'MyLink', linkAttribute: 'to' }],
        formComponents: [
          'CustomForm',
          { name: 'Form', formAttribute: 'endpoint' },
        ],
      },
      // Supported: jsx-a11y settings
      'jsx-a11y': {
        polymorphicPropName: 'as',
        components: {
          Link: 'a',
          IconButton: 'button',
          CustomImage: 'img',
        },
      },
      // Supported: next settings
      next: {
        rootDir: 'apps/web/',
      },
      // Supported: jsdoc settings
      jsdoc: {
        ignorePrivate: true,
        ignoreInternal: true,
        tagNamePreference: {
          returns: 'return',
        },
      },
      // Supported: vitest settings
      vitest: {
        typecheck: true,
      },
      // Unsupported: import settings (should be skipped with warning)
      'import/resolver': {
        typescript: true,
      },
      // Supported (for JS Plugins): custom plugin settings (should be skipped with warning if jsPlugins option is not enabled)
      'my-custom-plugin': {
        someOption: 'value',
      },
    },
    rules: {
      'react/jsx-uses-react': 'error',
      'react/jsx-uses-vars': 'error',
    },
  },
];

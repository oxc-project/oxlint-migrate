import eslintReact from '@eslint-react/eslint-plugin';

// Demonstrates a cross-config aliased plugin scenario: an aliased plugin is
// declared in one config object, rules using those plugins are declared in a
// separate object. Without access to meta.name, the alias cannot be resolved.
export default [
  // Config 1: only plugin registration, no rules
  {
    plugins: {
      // @ts-expect-error
      '@eslint-react/dom': eslintReact.configs.all.plugins['@eslint-react/dom'],
    },
  },
  // Config 2: only rules, no plugins
  {
    rules: {
      '@eslint-react/dom/no-find-dom-node': 'error',
      '@eslint-react/dom/no-namespace': 'warn',
    },
  },
];

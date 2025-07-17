import reactPerfPlugin from 'eslint-plugin-react-perf';
import reactHooks from 'eslint-plugin-react-hooks';
import reactPlugin from 'eslint-plugin-react';

export default [
  reactPlugin.configs.flat.recommended,
  reactPlugin.configs.flat['jsx-runtime'],
  reactHooks.configs['recommended-latest'],
  reactPerfPlugin.configs.flat.recommended,
];

import js from '@eslint/js';
import webApi from 'eslint-plugin-react-web-api';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig({
  files: ['**/*.{ts,tsx}'],
  extends: [
    js.configs.recommended,
    tseslint.configs.recommended,
    webApi.configs.recommended,
  ],
  rules: {
    'react-web-api/no-leaked-event-listener': 'error',
  },
});

import { defineConfig } from 'eslint/config';
import reactRefresh from 'eslint-plugin-react-refresh';

// This should result in an oxlint config with `react/only-export-components` enabled.
export default defineConfig(reactRefresh.configs.recommended);

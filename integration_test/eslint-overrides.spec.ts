import eslint_overrides_test from './projects/eslint-overrides.config.js';
import { testProject } from './utils.js';

// @ts-expect-error
testProject('eslint-overrides', eslint_overrides_test);

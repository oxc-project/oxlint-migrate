// @ts-expect-error
import options_merging_eslint_test from './projects/options-merging-eslint.config.mjs';
import { testProject } from './utils.js';

testProject('options-merging-eslint', options_merging_eslint_test);

// @ts-expect-error
import many_extends_test from './projects/config-with-extends.eslint.config.mjs';
import { testProject } from './utils.js';

testProject('config-with-extends.eslint.spec.ts', many_extends_test);

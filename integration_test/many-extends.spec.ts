// @ts-expect-error
import many_extends_test from './projects/many-extends.config.mjs';
import { testProject } from './utils.js';

testProject('many-extends.spec.ts', many_extends_test);

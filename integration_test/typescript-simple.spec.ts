// @ts-expect-error
import typescript_simple_test from './projects/typescript-simple.eslint.config.mjs';
import { testProject } from './utils.js';

testProject('typescript-simple', typescript_simple_test);

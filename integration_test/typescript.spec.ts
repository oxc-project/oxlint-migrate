// @ts-expect-error
import typescript_test from './projects/typescript.eslint.config.mjs';
import { testProject } from './utils.js';

testProject('typescript', typescript_test);

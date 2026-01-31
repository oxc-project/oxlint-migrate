// @ts-expect-error
import nextCoreWebVitalsConfig from './projects/next-core-web-vitals.eslint.config.mjs';
import { testProject } from './utils.js';

testProject('next-core-web-vitals', nextCoreWebVitalsConfig);

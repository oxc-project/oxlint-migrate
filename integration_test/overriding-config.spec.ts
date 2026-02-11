// @ts-expect-error
import overriding_config_test from './projects/overriding-config.config.mjs';
import { testProject } from './utils.js';

testProject('overriding-config', overriding_config_test);

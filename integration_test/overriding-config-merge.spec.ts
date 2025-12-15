// @ts-expect-error
import overriding_config_merge_test from './projects/overriding-config-merge.config.js';
import { testProject } from './utils.js';

testProject('overriding-config-merge', overriding_config_merge_test);

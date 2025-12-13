// @ts-expect-error
import overriding_config_merge_with_files_test from './projects/overriding-config-merge-with-files.config.js';
import { testProject } from './utils.js';

testProject(
  'overriding-config-merge-with-files',
  overriding_config_merge_with_files_test
);

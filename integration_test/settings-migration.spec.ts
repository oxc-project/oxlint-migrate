import { testProject } from './utils.js';
// @ts-expect-error
import config from './projects/settings-migration.eslint.config.mjs';

testProject('settings-migration', config);

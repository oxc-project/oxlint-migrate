// @ts-expect-error
import react_test from './projects/react-project.eslint.config.mjs';
import { testProject } from './utils.js';

testProject('react-project', react_test);

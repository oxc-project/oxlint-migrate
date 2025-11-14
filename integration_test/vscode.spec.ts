// @ts-expect-error
import vscode_test from './projects/vscode.eslint.config.js';
import { testProject } from './utils.js';

testProject('vscode', vscode_test);

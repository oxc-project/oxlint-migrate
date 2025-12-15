// @ts-expect-error
import puppeteer_test from './projects/puppeteer.eslint.config.mjs';
import { testProject } from './utils.js';

testProject('puppeteer', puppeteer_test);

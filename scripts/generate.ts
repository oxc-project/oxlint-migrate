import fs from 'node:fs';
import path from 'node:path';
import { RulesGenerator } from './generator.js';
import { traverseRules } from './traverse-rules.js';
import packageJson from '../package.json' with { type: 'json' };

const result = traverseRules();

const __dirname = new URL('.', import.meta.url).pathname;
const generateFolder = path.resolve(__dirname, '..', `src/generated`);

if (!fs.existsSync(generateFolder)) {
  fs.mkdirSync(generateFolder);
}

// Generate the vitest-compatible-jest-rules.json file by pulling it from the oxc repository.
// This keeps the two in sync.
// Use the version of the package to determine which git ref to pull from.
const gitRef = `oxlint_v${packageJson.version}`;

const githubURL = `https://raw.githubusercontent.com/oxc-project/oxc/${gitRef}/crates/oxc_linter/data/vitest_compatible_jest_rules.json`;
const response = await fetch(githubURL);

if (!response.ok) {
  throw new Error(
    `Failed to fetch vitest-compatible-jest-rules.json: ${response.status} ${response.statusText}`
  );
}

const vitestRules = await response.text();
const vitestRulesPath = path.resolve(
  generateFolder,
  'vitest-compatible-jest-rules.json'
);
fs.writeFileSync(vitestRulesPath, vitestRules, 'utf-8');

console.log(
  'vitest-compatible-jest-rules.json copied successfully from the oxc repo.'
);

const generator = new RulesGenerator(result);
await generator.generateRules(generateFolder);

console.log('Rules generated successfully.');

import fs from 'node:fs';
import path from 'node:path';
import packageJson from '../package.json' with { type: 'json' };

const __dirname = new URL('.', import.meta.url).pathname;
// `<repo>/scripts/generated/`
const scriptsGenerateFolder = path.resolve(__dirname, `generated`);

if (!fs.existsSync(scriptsGenerateFolder)) {
  fs.mkdirSync(scriptsGenerateFolder);
}

// Fetch the unsupported-rules.json file from the oxc repository.
// Use the version of the package to determine which git ref to pull from.
const gitRef = `oxlint_v${packageJson.version}`;
const unsupportedRulesURL = `https://raw.githubusercontent.com/oxc-project/oxc/${gitRef}/tasks/lint_rules/src/unsupported-rules.json`;
const response = await fetch(unsupportedRulesURL);

if (!response.ok) {
  throw new Error(
    `Failed to fetch unsupported-rules.json: ${response.status} ${response.statusText}`
  );
}

const unsupportedRules = await response.text();
const unsupportedRulesPath = path.resolve(
  scriptsGenerateFolder,
  'unsupported-rules.json'
);
fs.writeFileSync(unsupportedRulesPath, unsupportedRules, 'utf-8');

console.log('unsupported-rules.json copied successfully from the oxc repo.');

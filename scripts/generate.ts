import fs from 'node:fs';
import path from 'node:path';
import { RulesGenerator } from './generator.js';
import { traverseRules } from './traverse-rules.js';

const __dirname = new URL('.', import.meta.url).pathname;

const result = traverseRules();
const generator = new RulesGenerator(result);

// `<repo>/src/generated/`
const generateFolder = path.resolve(__dirname, '..', `src/generated`);
if (!fs.existsSync(generateFolder)) {
  fs.mkdirSync(generateFolder);
}

await generator.generateRules(generateFolder);

console.log('Rules generated successfully.');

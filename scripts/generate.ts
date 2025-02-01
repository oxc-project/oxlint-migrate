import fs from 'node:fs';
import path from 'node:path';
import { RulesGenerator } from './generator.js';
import { traverseRules } from './traverse-rules.js';

const result = traverseRules();

const __dirname = new URL('.', import.meta.url).pathname;
const generateFolder = path.resolve(__dirname, '..', `src/generated`);

if (!fs.existsSync(generateFolder)) {
  fs.mkdirSync(generateFolder);
}

const generator = new RulesGenerator(result);
await generator.generateRules(generateFolder);

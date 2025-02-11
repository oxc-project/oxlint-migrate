import { program } from 'commander';

program
  .name('oxlint-migrate')
  .version('0.0.0')
  // ToDo auto detect it
  .argument('<eslint-config>', 'The path to the eslint-config file');

program.parse();

console.log(program.args);

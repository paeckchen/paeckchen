import * as minimistNode from 'minimist';
const minimist: typeof minimistNode = minimistNode;

import { bundle } from './bundle';

// TODO: create config file
// TODO: add watch mode
const argv = minimist(process.argv.slice(2), {
  string: [
    'config',
    'entry',
    'source',
    'runtime',
    'out-dir',
    'out-file',
    'runtime',
    'alias'
  ],
  boolean: ['watch'],
  default: {
    source: 'es2015',
    watch: false
  }
});

const startTime = new Date().getTime();
process.stdout.write(bundle({
  configFile: argv['config'],
  entryPoint: argv['entry'],
  source: argv['source'],
  outputDirectory: argv['out-dir'],
  outputFile: argv['out-file'],
  runtime: argv['runtime'],
  alias: argv['alias'],
  watchMode: argv['watch']
}));
const endTime = new Date().getTime();
process.stderr.write(`Bundeling took ${(endTime - startTime) / 1000}s`);

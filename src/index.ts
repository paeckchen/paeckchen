import * as minimistNode from 'minimist';
const minimist: typeof minimistNode = minimistNode;

import { bundle } from './bundle';

const argv = minimist(process.argv.slice(2), {
  string: [
    'config',
    'entry',
    'source',
    'runtime',
    'out-dir',
    'out-file',
    'runtime',
    'alias',
    'external'
  ],
  boolean: ['watch']
});

const startTime = new Date().getTime();
bundle({
  configFile: argv['config'],
  entryPoint: argv['entry'],
  source: argv['source'],
  outputDirectory: argv['out-dir'],
  outputFile: argv['out-file'],
  runtime: argv['runtime'],
  alias: argv['alias'],
  external: argv['external'],
  watchMode: argv['watch']
}, undefined, (error, result) => {
  if (result) {
    process.stdout.write(result);
  }
  const endTime = new Date().getTime();
  process.stderr.write(`Bundeling took ${(endTime - startTime) / 1000}s\n`);
});

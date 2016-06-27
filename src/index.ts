import { join } from 'path';
import * as minimistNode from 'minimist';
const minimist: typeof minimistNode = minimistNode;

import { bundle } from './bundle';

// TODO: create config file
// TODO: add watch mode
const argv = minimist(process.argv.slice(2), {
  string: ['config', 'entry'],
  boolean: ['watch'],
  default: {
    config: join(__dirname, 'paeckchen.config.js'),
    watch: false
  }
});
if (!argv['entry']) {
  throw new Error('Missing --entry argument');
}

const startTime = new Date().getTime();
process.stdout.write(bundle(argv['entry']));
const endTime = new Date().getTime();
process.stderr.write(`Bundeling took ${(endTime - startTime) / 1000}s`);

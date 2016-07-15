#!/usr/bin/env node

import { createOptions } from './options';
import { bundle } from 'paeckchen-core';

const startTime = new Date().getTime();
const result = bundle(createOptions(process.argv));
if (result) {
  process.stdout.write(result);
}
const endTime = new Date().getTime();
process.stderr.write(`Bundeling took ${(endTime - startTime) / 1000}s\n`);

#!/usr/bin/env node

import { join } from 'path';
import { createOptions } from './options';
import { bundle, DefaultHost, IPaeckchenContext } from 'paeckchen-core';

const startTime = new Date().getTime();
const options = createOptions(process.argv);
bundle(options, new DefaultHost(), (result: string, context: IPaeckchenContext) => {
  if (result) {
    if (options.outputFile) {
      context.host.writeFile(join(context.config.output.folder, context.config.output.file), result);
    } else {
      process.stdout.write(result);
    }
  }
  const endTime = new Date().getTime();
  process.stderr.write(`Bundeling took ${(endTime - startTime) / 1000}s\n`);
});

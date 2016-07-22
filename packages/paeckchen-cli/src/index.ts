#!/usr/bin/env node

import { join } from 'path';
import { createOptions } from './options';
import { bundle, DefaultHost, IPaeckchenContext } from 'paeckchen-core';

const startTime = new Date().getTime();
const options = createOptions(process.argv);
bundle(options, new DefaultHost(), (code: string, souceMap: string|undefined, context: IPaeckchenContext) => {
  if (code) {
    if (context.config.output.file) {
      context.host.writeFile(join(context.config.output.folder, context.config.output.file), code);
    } else {
      process.stdout.write(code);
    }
  }
  const endTime = new Date().getTime();
  if (options.logger) {
    options.logger.info('cli', `Bundeling took ${(endTime - startTime) / 1000}s`);
  }
});

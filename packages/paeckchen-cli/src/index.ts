#!/usr/bin/env node

import { join, basename } from 'path';
import { createOptions } from './options';
import { bundle, DefaultHost, PaeckchenContext } from 'paeckchen-core';

const sourceMappingURL = '\n//# sourceMappingURL=';

const startTime = new Date().getTime();
const options = createOptions(process.argv);
bundle(options, new DefaultHost(), (code: string, sourceMap: string|undefined, context: PaeckchenContext) => {
  if (code) {
    if (context.config.output.file) {
      const bundleName = join(context.config.output.folder, context.config.output.file);
      const mapName = bundleName + '.map';
      if (sourceMap) {
        context.host.writeFile(bundleName, code + sourceMappingURL + basename(mapName));
        context.host.writeFile(mapName, sourceMap);
      } else {
        context.host.writeFile(bundleName, code);
      }
    } else {
      let output = code;
      if (sourceMap) {
        output += sourceMappingURL
          + 'data:application/json;charset=utf-8;base64,' + new Buffer(sourceMap).toString('base64');
      }
      process.stdout.write(output);
    }
  }
  const endTime = new Date().getTime();
  if (options.logger) {
    options.logger.info('cli', `Bundeling took ${(endTime - startTime) / 1000}s`);
  }
})
.catch(e => {
  if (options.logger) {
    options.logger.error('cli', e, 'Bundeling failed');
  }
  process.exit(1);
});

#!/usr/bin/env node

import { join, basename } from 'path';
import { createOptions } from './options';
import { CliLogger } from './cli-logger';
import { bundle, DefaultHost } from 'paeckchen-core';

const sourceMappingURL = '\n//# sourceMappingURL=';

const options = createOptions(process.argv);
bundle(options, new DefaultHost(), (error, context, code, sourceMap) => {
  if (error) {
    if (!context) {
      context = {
        config: {
          watchMode: false
        }
      } as any;
    }
    if (options.logger) {
      options.logger.error('cli', error, 'Bundeling failed');
    }
    if (context && !context.config.watchMode) {
      (context.logger as CliLogger).reset();
      process.exit(1);
    }
  } else {
    if (context && context.config.output.file) {
      const bundleName = join(context.config.output.folder, context.config.output.file);
      const mapName = bundleName + '.map';
      if (sourceMap) {
        if (context.config.output.sourceMap === 'inline') {
          context.host.writeFile(bundleName, appendSourceMap(code as string, sourceMap));
        } else {
          context.host.writeFile(bundleName, code + sourceMappingURL + basename(mapName));
          context.host.writeFile(mapName, sourceMap);
        }
      } else {
        context.host.writeFile(bundleName, code as string);
      }
    } else {
      let output = code as string;
      if (sourceMap) {
        output = appendSourceMap(output, sourceMap);
      }
      process.stdout.write(output);
    }
  }
});

function appendSourceMap(code: string, sourceMap: string): string {
  return code + sourceMappingURL + 'data:application/json;charset=utf-8;base64,'
    + new Buffer(sourceMap).toString('base64');
}

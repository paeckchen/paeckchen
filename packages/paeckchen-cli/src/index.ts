#!/usr/bin/env node

import { join, basename } from 'path';
import { createOptions } from './options';
import { bundle, DefaultHost, PaeckchenContext } from 'paeckchen-core';

const sourceMappingURL = '\n//# sourceMappingURL=';

const options = createOptions(process.argv);
bundle(options, new DefaultHost(), (code: string, sourceMap: string|undefined, context: PaeckchenContext) => {
  if (code) {
    if (context.config.output.file) {
      const bundleName = join(context.config.output.folder, context.config.output.file);
      const mapName = bundleName + '.map';
      if (sourceMap) {
        if (context.config.output.sourceMap === 'inline') {
          context.host.writeFile(bundleName, appendSourceMap(code, sourceMap));
        } else {
          context.host.writeFile(bundleName, code + sourceMappingURL + basename(mapName));
          context.host.writeFile(mapName, sourceMap);
        }
      } else {
        context.host.writeFile(bundleName, code);
      }
    } else {
      let output = code;
      if (sourceMap) {
        output = appendSourceMap(output, sourceMap);
      }
      process.stdout.write(output);
    }
  }
})
.catch(e => {
  if (options.logger) {
    options.logger.error('cli', e, 'Bundeling failed');
  }
  process.exit(1);
});

function appendSourceMap(code: string, sourceMap: string): string {
  return code + sourceMappingURL + 'data:application/json;charset=utf-8;base64,'
    + new Buffer(sourceMap).toString('base64');
}

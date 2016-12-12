#!/usr/bin/env node

import { bundle, DefaultHost, PaeckchenContext } from 'paeckchen-core';
import { join, basename } from 'path';

import { CliLogger } from './cli-logger';
import { createOptions } from './options';

const sourceMappingURL = '\n//# sourceMappingURL=';

function onError(context: PaeckchenContext|undefined, error: Error): void {
  if (!context) {
    context = {
      config: {
        watchMode: false
      }
    } as any;
  }
  if (options.logger) {
    options.logger.error('cli', error, 'Bundeling failed');
    (options.logger as CliLogger).reset();
  }
  if (context && !context.config.watchMode) {
    process.exit(1);
  }
}

function writeSourceMap(context: PaeckchenContext, bundleName: string, code: string|undefined,
    sourceMap: string): void {
  if (context.config.output.sourceMap === 'inline') {
    context.host.writeFile(bundleName, appendSourceMap(code as string, sourceMap));
  } else {
    const mapName = bundleName + '.map';
    context.host.writeFile(bundleName, code + sourceMappingURL + basename(mapName));
    context.host.writeFile(mapName, sourceMap);
  }
}

const options = createOptions(process.argv);
bundle(options, new DefaultHost(), (error, context, code, sourceMap) => {
  if (error) {
    onError(context, error);
  } else {
    if (context && context.config.output.file) {
      const bundleName = join(context.config.output.folder, context.config.output.file);
      if (sourceMap) {
        writeSourceMap(context, bundleName, code, sourceMap);
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

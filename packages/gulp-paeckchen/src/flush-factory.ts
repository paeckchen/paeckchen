import { fromJSON } from 'convert-source-map';
import { File } from 'gulp-util';
import { bundle } from 'paeckchen-core';
import { relative } from 'path';
import { Transform } from 'stream';

import { PLUGIN_NAME, GulpContext, GulpOptions, ExtendedFile } from './context';

export function flushFactory(opts: GulpOptions, gulpContext: GulpContext,
    bundleFn: typeof bundle = bundle): (callback: () => void) => void {
  return function flush(this: Transform, callback: () => void): void {
    // remember these out of current scope
    gulpContext.stream = this;
    gulpContext.flushCallback = callback;
    if (gulpContext.host) {
      if (gulpContext.firstFlush) {
        gulpContext.firstFlush = false;
        // enable source-map if found in given sources
        if (gulpContext.withSourceMap) {
          (opts as GulpOptions).sourceMap = true;
        }
        bundleFn(opts, gulpContext.host, (error, context, code, sourceMap) => {
          if (error) {
            gulpContext.logger.error(PLUGIN_NAME, error, 'Bundling failed');
            if ((opts as GulpOptions).exitOnError) {
              process.exit(1);
            } else {
              gulpContext.stream.emit('end');
            }
          } else if (context && code) {
            const path = context.config.output.file || relative(gulpContext.firstFile.base, gulpContext.firstFile.path);
            const file: ExtendedFile = new File({
              path,
              contents: new Buffer(code)
            });

            if (sourceMap) {
              file.sourceMap = fromJSON(sourceMap).toObject();
              // Fix sourcemap output name if one was given upfront
              file.sourceMap.file = context.config.output.file || gulpContext.firstFile.basename;
            }
            gulpContext.host.addFile(file);
            gulpContext.stream.push(file);
            gulpContext.flushCallback();
          }
        });
      } else {
        // trigger watch updates
        gulpContext.host.emitWatcherEvents();
      }
    } else {
      return gulpContext.flushCallback();
    }
  };
}

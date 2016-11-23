import { fromObject } from 'convert-source-map';
import { File, PluginError } from 'gulp-util';
import { Transform } from 'stream';

import { GulpContext, ExtendedFile, PLUGIN_NAME } from './context';
import { GulpHost } from './host';

export interface TranformFunction {
  (file: ExtendedFile, enc: string, callback: (err?: any, data?: any) => void): void;
}

export function transformFactory(context: GulpContext): TranformFunction {
  return function createHost(this: Transform, file: ExtendedFile, enc: string,
      callback: (err?: any, data?: any) => void): void {
    if (file.isNull()) {
      return callback(null, file);
    } else if (file.isStream()) {
      this.emit('error', new PluginError(PLUGIN_NAME, 'Streaming not supported'));
      return callback();
    }

    if (!context.firstFile) {
      context.firstFile = file;
    }
    if (!context.host) {
      context.host = new GulpHost(context.firstFile.base);
    }
    context.host.addFile(file);
    if (file.sourceMap) {
      context.withSourceMap = true;
      context.host.addFile(new File({
        path: `${file.path}.map`,
        contents: new Buffer(fromObject(file.sourceMap).toJSON())
      }));
    }

    callback();
  };
}

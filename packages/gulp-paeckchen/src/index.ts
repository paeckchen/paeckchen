import { join, relative } from 'path';
import { Transform } from 'stream';
import { File, PluginError, log } from 'gulp-util';
import * as through from 'through2';
import { bundle, BundleOptions } from 'paeckchen-core';
import { GulpHost } from './host';

const PLUGIN_NAME = 'gulp-paeckchen';

export function paeckchen(opts: BundleOptions = {}): NodeJS.ReadWriteStream {

  let firstFile: File;
  let host: GulpHost;

  function createHost(this: Transform, file: File, enc: string,
      callback: (err?: any, data?: any) => void): void {
    if (file.isNull()) {
      return callback(null, file);
    } else if (file.isStream()) {
      this.emit('error', new PluginError(PLUGIN_NAME, 'Streaming not supported'));
      return callback();
    }

    if (!firstFile) {
      firstFile = file;
    }
    if (!host) {
      host = new GulpHost();
    }
    host.addFile(file);

    callback();
  }

  function flush(this: Transform, callback: () => void): void {
    if (host) {
      bundle(opts, host, (error, context, code, sourceMap) => {
        if (error) {
          flushError.call(this, error);
          callback();
        } else if (context && code) {
          const path = join(context.config.output.folder,
            context.config.output.file || relative(firstFile.cwd, firstFile.path));
          context.host.writeFile(path, code);
          this.push(host.getFile(path));
          callback();
        }
      });
    } else {
      return callback();
    }
  }

  function flushError(this: Transform, error: Error): void {
    // TODO: Error handling in flush function
    log(error.message);
    log(error.stack);
    this.emit('error', new PluginError(PLUGIN_NAME, error));
  }

  return through.obj(createHost, flush);
}

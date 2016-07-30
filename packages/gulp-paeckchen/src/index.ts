import { join, relative } from 'path';
import { Transform } from 'stream';
import { File, PluginError } from 'gulp-util';
import * as through from 'through2';
import { bundle, BundleOptions } from 'paeckchen-core';
import { GulpHost } from './host';
import { GulpLogger } from './logger';

const PLUGIN_NAME = 'gulp-paeckchen';

export interface GulpOptions extends BundleOptions {
  exitOnError?: boolean;
}

export function paeckchen(opts: GulpOptions|string = {}): NodeJS.ReadWriteStream {
  if (typeof opts === 'string') {
    opts = {
      entryPoint: opts
    };
  }
  const logger = opts.logger = opts.logger || new GulpLogger();
  opts.exitOnError = typeof opts.exitOnError === 'boolean' ? opts.exitOnError : true;

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
          logger.error(PLUGIN_NAME, error, 'Bundling failed');
          if ((opts as GulpOptions).exitOnError) {
            process.exit(1);
          } else {
            this.emit('end');
          }
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

  return through.obj(createHost, flush);
}

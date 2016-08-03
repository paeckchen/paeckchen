import { join, relative, dirname } from 'path';
import { Transform } from 'stream';
import { File, PluginError } from 'gulp-util';
import * as through from 'through2';
import { fromJSON, fromObject } from 'convert-source-map';
import { bundle, BundleOptions } from 'paeckchen-core';
import { GulpHost } from './host';
import { GulpLogger } from './logger';

const PLUGIN_NAME = 'gulp-paeckchen';

interface ExtendedFile extends File {
  sourceMap?: any;
}

export interface GulpOptions extends BundleOptions {
  exitOnError?: boolean;
}

export interface GulpPaeckchen {
  (): NodeJS.ReadWriteStream;
}

export function paeckchen(opts: GulpOptions|string = {}): GulpPaeckchen {

  if (typeof opts === 'string') {
    opts = {
      entryPoint: opts
    };
  }
  const logger = opts.logger = opts.logger || new GulpLogger();
  opts.exitOnError = typeof opts.exitOnError === 'boolean' ? opts.exitOnError : true;
  // Always enable, because it does not keep node running when not in watch mode
  opts.watchMode = true;

  let firstFile: ExtendedFile;
  let host: GulpHost;
  let firstFlush = true;
  // Remember stream and callback in paeckchen scope, not in stream scope
  // otherwise we would probably write to a closed stream
  let stream: Transform;
  let flushCallback: () => void;

  function createHost(this: Transform, file: ExtendedFile, enc: string,
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
    console.error('add file', file.path, file.contents.toString());
    host.addFile(file);
    if (file.sourceMap) {
      console.error('SM', file.path, file.sourceMap);
      host.addFile(new File({
        path: `${file.path}.map`,
        contents: new Buffer(fromObject(file.sourceMap).toJSON())
      }));
    }

    callback();
  }

  function flush(this: Transform, callback: () => void): void {
    // Remember these out of current scope
    stream = this;
    flushCallback = callback;
    if (host) {
      if (firstFlush) {
        firstFlush = false;
        bundle(opts, host, (error, context, code, sourceMap) => {
          if (error) {
            logger.error(PLUGIN_NAME, error, 'Bundling failed');
            if ((opts as GulpOptions).exitOnError) {
              process.exit(1);
            } else {
              stream.emit('end');
            }
          } else if (context && code) {
            const path = join(context.config.output.folder,
              context.config.output.file || relative(firstFile.cwd, firstFile.path));
            context.host.writeFile(path, code);
            const file = host.getFile(path) as ExtendedFile;
            if (sourceMap) {
              const sourceMapConverter = fromJSON(sourceMap);
              file.sourceMap = sourceMapConverter.toObject();
              file.sourceMap.file = path;
              console.error('result-map', file.sourceMap);
            }
            stream.push(file);
            flushCallback();
          }
        });
      } else {
        // trigger watch updates
        host.emitWatcherEvents();
      }
    } else {
      return flushCallback();
    }
  }

  return function bundler(): NodeJS.ReadWriteStream {
    return through.obj(createHost, flush);
  };
}

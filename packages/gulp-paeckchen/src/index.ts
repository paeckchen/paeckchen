import { join } from 'path';
import { Transform } from 'stream';
import { File, PluginError, log } from 'gulp-util';
import * as through from 'through2';
import { Host, bundle, BundleOptions, PaeckchenContext } from 'paeckchen-core';

const PLUGIN_NAME = 'gulp-paeckchen';

export class GulpHost implements Host {

  private _files: {[path: string]: File} = {};

  get files(): {[path: string]: File} {
    return this._files;
  }

  public cwd(): string {
    return process.cwd();
  }

  public fileExists(path: string): boolean {
    return path in this._files;
  }

  public isFile(path: string): Promise<boolean> {
    return Promise.resolve()
      .then(() => {
        return !this._files[path].isDirectory();
      });
  }

  public readFile(path: string): Promise<string> {
    return Promise.resolve()
      .then(() => {
        return this._files[path].contents.toString();
      });
  }

  public writeFile(path: string, content: string): void {
    this._files[path] = new File({
      path,
      contents: new Buffer(content)
    });
  }

  public getModificationTime(path: string): Promise<number> {
    return Promise.resolve()
      .then(() => {
        const file = this._files[path];
        return file.stat && file.stat.mtime ? file.stat.mtime.getTime() : -1;
      });
  }

}

export function paeckchen(entryPoint: string, opts: BundleOptions = {}): NodeJS.ReadWriteStream {

  let host: GulpHost;

  function createHost(this: Transform, file: File, enc: string,
      callback: (err?: any, data?: any) => void): void {

    if (file.isNull()) {
      return callback(null, file);
    }

    if (file.isStream()) {
      this.emit('error', new PluginError(PLUGIN_NAME, 'Streaming not supported'));
      return callback();
    }

    if (!host) {
      host = new GulpHost();
    }
    host.files[file.path] = file;

    callback();
  }

  function flush(this: Transform, callback: () => void): void {
    if (host) {
      const bundleOptions: BundleOptions = {
        entryPoint
      };

      bundle(bundleOptions, host, (code: string, sourceMap: string, context: PaeckchenContext) => {
          try {
            const path = join(context.config.output.folder, context.config.output.file || entryPoint);
            context.host.writeFile(path, code);

            this.push(host.files[path]);
            callback();
          } catch (err) {
            // TODO: Error handling in flush function
            log(err.message);
            log(err.stack);
            this.emit('error', new PluginError(PLUGIN_NAME, err));
            callback();
          }
        })
        .catch(err => {
          // TODO: Error handling in flush function
          log(err.message);
          log(err.stack);
          this.emit('error', new PluginError(PLUGIN_NAME, err));
          callback();
        });
    } else {
      return callback();
    }
  }

  return through.obj(createHost, flush);
}

import { join } from 'path';
import { Transform } from 'stream';
import { File, PluginError, log } from 'gulp-util';
import * as through from 'through2';
import { Host, bundle as paeckchenBundle, BundleOptions, PaeckchenContext } from 'paeckchen-core';

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

export interface GulpPaeckchenOpts {
  // @internal
  host?: GulpHost;
  bundle?: typeof paeckchenBundle;
}

export function paeckchen(entryPoint: string, opts: GulpPaeckchenOpts = {}): NodeJS.ReadWriteStream {

  function createHost(this: Transform, file: File, enc: string,
      callback: (err?: any, data?: any) => void): void {

    if (file.isNull()) {
      return callback(null, file);
    }

    if (file.isStream()) {
      this.emit('error', new PluginError(PLUGIN_NAME, 'Streaming not supported'));
      return callback();
    }

    if (!opts.host) {
      opts.host = new GulpHost();
    }
    if (!opts.bundle) {
      opts.bundle = paeckchenBundle;
    }

    if (opts.host) {
      opts.host.files[file.path] = file;
    }

    callback();
  }

  function bundle(this: Transform, callback: () => void): void {
    if (opts.bundle && opts.host) {
      const bundleOptions: BundleOptions = {
        entryPoint
      };

      opts
        .bundle(bundleOptions, opts.host, (code: string, sourceMap: string, context: PaeckchenContext) => {
          try {
            const path = join(context.config.output.folder, context.config.output.file || entryPoint);
            const file = new File({
              path,
              contents: new Buffer(code)
            });

            this.push(file);
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

  return through.obj(createHost, bundle);
}

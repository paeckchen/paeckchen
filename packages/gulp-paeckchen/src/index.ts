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
    throw new Error('TODO');
  }

  public fileExists(path: string): boolean {
    throw new Error('TODO');
  }

  public isFile(path: string): Promise<boolean> {
    throw new Error('TODO');
  }

  public readFile(path: string): Promise<string> {
    throw new Error('TODO');
  }

  public writeFile(path: string, content: string): void {
    throw new Error('TODO');
  }

  public getModificationTime(path: string): Promise<number> {
    throw new Error('TODO');
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
          const path = join(context.config.output.folder, context.config.output.file);
          const file = new File({
            path,
            contents: new Buffer(code)
          });

          this.push(file);
          callback();
        })
        .catch(err => {
          log(err.message);
          log(err.stack);
          this.emit('error', new PluginError(PLUGIN_NAME, err));
          callback();
        });
    }
    return callback();
  }

  return through.obj(createHost, bundle);
}

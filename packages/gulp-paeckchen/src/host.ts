import { File } from 'gulp-util';
import { Host, Watcher } from 'paeckchen-core';

import { VinylWatcher } from './watcher';

/**
 * Returns true if file2 is newer than file1.
 * In case of no mtime is available for one file, the one with mtime is newer.
 * In case of no mtime is available for both files, file2 is newer.
 */
function isNewer(file1: File, file2: File): boolean {
  const time1 = file1.stat && file1.stat.mtime.getTime() || -2;
  const time2 = file2.stat && file2.stat.mtime.getTime() || -1;
  return time1 < time2;
}

export class GulpHost implements Host {

  private _cwd: string;

  private watcher: VinylWatcher;

  private files: {[path: string]: File} = {};

  constructor(cwd: string) {
    this._cwd = cwd;
  }

  public addFile(file: File): void {
    const exists = file.path in this.files;
    const update = !exists || isNewer(this.files[file.path], file);
    this.files[file.path] = file;
    if (this.watcher && update) {
      if (exists) {
        this.watcher.updateFile(file.path);
      } else {
        this.watcher.addFile(file.path);
      }
    }
  }

  public getFile(path: string): File | undefined {
    return this.files[path];
  }

  public cwd(): string {
    return this._cwd;
  }

  public fileExists(path: string): boolean {
    return path in this.files;
  }

  public isFile(path: string): Promise<boolean> {
    return Promise.resolve()
      .then(() => {
        return !this.files[path].isDirectory();
      });
  }

  public readFile(path: string): Promise<string> {
    return Promise.resolve()
      .then(() => {
        return this.files[path].contents!.toString();
      });
  }

  public writeFile(path: string, content: string): void {
    this.addFile(new File({
      path,
      contents: new Buffer(content)
    }));
  }

  public getModificationTime(path: string): Promise<number> {
    return Promise.resolve()
      .then(() => {
        const file = this.files[path];
        return file.stat && file.stat.mtime ? file.stat.mtime.getTime() : -1;
      });
  }

  public createWatcher(): Watcher {
    if (!this.watcher) {
      this.watcher = new VinylWatcher();
    }
    return this.watcher;
  }

  public emitWatcherEvents(): void {
    if (this.watcher) {
      this.watcher.emitEvents();
    }
  }

}

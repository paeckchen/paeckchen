import { dirname } from 'path';
import { FSWatcher } from 'chokidar';
import { IHost } from './host';

type FileMap = { [name: string]: boolean };
type WatcherMap = { [name: string]: number };

export class Watcher {

  private host: IHost;

  private watcher: FSWatcher;

  private watchers: WatcherMap = {};

  private files: FileMap = {};

  constructor(host: IHost, watcher: FSWatcher = new FSWatcher()) {
    this.host = host;
    this.watcher = watcher;
  }

  public start(updateHandler: (event: string, fileName: string) => void): void {
    this.watcher = this.watcher
      .on('add', (fileName) => this.onAdd(fileName, updateHandler))
      .on('change', (fileName) => this.onChange(fileName, updateHandler))
      .on('unlink', (fileName) => this.onUnlink(fileName, updateHandler));
  }

  private onAdd(fileName: string, updateHandler: (event: string, fileName: string) => void): void {
    if (this.files[fileName]) {
      updateHandler('add', fileName);
    }
  }

  private onChange(fileName: string, updateHandler: (event: string, fileName: string) => void): void {
    if (this.files[fileName]) {
      updateHandler('update', fileName);
    }
  }

  private onUnlink(fileName: string, updateHandler: (event: string, fileName: string) => void): void {
    if (this.files[fileName]) {
      delete this.files[fileName];
      const dir = dirname(fileName);
      this.watchers[dir]--;
      updateHandler('remove', fileName);
    }
  }

  public watchFile(fileName: string): void {
    const dir = dirname(fileName);
    if (!this.watchers[dir]) {
      this.watchers[dir] = 0;
      this.watcher.add(dir);
    }
    if (!this.files[fileName]) {
      this.files[fileName] = true;
      this.watchers[dir]++;
    }
  }

  public unwatchFile(fileName: string): void {
    const dir = dirname(fileName);
    if (this.files[fileName]) {
      delete this.files[fileName];
      this.watchers[dir]--;
    }
    this.unwatchDirectory(dir);
  }

  private unwatchDirectory(dirName: string): void {
    if (!this.watchers[dirName]) {
      delete this.watchers[dirName];
      this.watcher.unwatch(dirName);
    }
  }

}

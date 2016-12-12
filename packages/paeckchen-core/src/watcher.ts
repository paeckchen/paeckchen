import { FSWatcher as Chokidar } from 'chokidar';
import { dirname } from 'path';

type FileMap = { [name: string]: boolean };
type WatcherMap = { [name: string]: number };

/**
 * Watcher interface.
 *
 * This is the API paeckchen uses to register watch tasks on used modules and unregisters them on deletion.
 */
export interface Watcher {

  /**
   * This callback is being called whenever a watched file receives some sort of update.
   *
   * @callback Watcher.updateHandler
   * @param {string} event - The event name (must be either 'add', 'update' or 'remove')
   * @param {string} fileName - The absolute path to the watched file in this event
   */

  /**
   * Called by paeckchen to start the first watch task.
   * This is only called once per paeckchen instance.
   *
   * @param {Watcher.updateHandler} updateHandler
   */
  start(updateHandler: (event: string, fileName: string) => void): void;

  /**
   * This is called by paeckchen to register a new file to watch.
   *
   * @param {string} fileName - The absolute file path to watch
   */
  watchFile(fileName: string): void;

  /**
   * This is called by paeckchen to unregister a file currently watched.
   *
   * @param {string} fileName - The absolute file path to unwatch
   */
  unwatchFile(fileName: string): void;
}

export class FSWatcher implements Watcher {

  private watcher: Chokidar;

  private watchers: WatcherMap = {};

  private files: FileMap = {};

  constructor(watcher: Chokidar = new Chokidar()) {
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

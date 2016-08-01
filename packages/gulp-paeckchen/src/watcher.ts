import { Watcher } from 'paeckchen-core';

export class VinylWatcher implements Watcher {

  private callback: (event: string, fileName: string) => void;

  private watchedFiles: {[path: string]: boolean} = {};

  private events: {[fileName: string]: string} = {};

  public start(updateHandler: (event: string, fileName: string) => void): void {
    this.callback = updateHandler;
  }

  public watchFile(fileName: string): void {
    this.watchedFiles[fileName] = true;
  }

  public unwatchFile(fileName: string): void {
    delete this.watchedFiles[fileName];
  }

  public addFile(fileName: string): void {
    if (fileName in this.watchedFiles) {
      this.events[fileName] = 'add';
    }
  }

  public updateFile(fileName: string): void {
    if (fileName in this.watchedFiles) {
      this.events[fileName] = 'update';
    }
  }

  public emitEvents(): void {
    Object.keys(this.events).forEach(fileName => {
      this.callback(this.events[fileName], fileName);
    });
    this.events = {};
  }

}

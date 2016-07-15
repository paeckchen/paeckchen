declare module 'chokidar' {

  export interface IOptions {
    persistent?: boolean;
    ignoreInitial?: boolean;
    ignorePermissionErrors?: boolean;
    interval?: number;
    binaryInterval?: number;
    useFsEvents?: boolean;
    usePolling?: boolean;
    atomic?: boolean;
    followSymlinks?: boolean;
    awaitWriteFinish?: boolean;
  }

  export function watch(paths: string|string[], options: IOptions): FSWatcher;

  export class FSWatcher {
    constructor(options?: IOptions);
    public add(paths: string|string[]): FSWatcher;
    public on(event: 'add', fn: (path: string) => void): FSWatcher;
    public on(event: 'change', fn: (path: string) => void): FSWatcher;
    public on(event: 'unlink', fn: (path: string) => void): FSWatcher;
    public on(event: string, fn: (path: string) => void): FSWatcher;
    public unwatch(paths: string|string[]): FSWatcher;
    public close(): FSWatcher;
  }

}

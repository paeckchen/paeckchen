import { DetectedGlobals } from './globals';
import { PaeckchenContext } from './bundle';
import { updateModule, enqueueModule } from './modules';

export interface WrappedModule {
  index: number;
  name: string;
  ast?: ESTree.Statement;
  remove: boolean;
  mtime: number;
}

export class State {

  private _detectedGlobals: DetectedGlobals = {
    global: false,
    process: false,
    buffer: false
  };

  public readonly modules: (ESTree.Expression | ESTree.SpreadElement)[];

  private _wrappedModules: { [name: string]: WrappedModule } = {};

  private _nextModuleIndex: number = 0;

  public moduleWatchCallbackAdded: boolean = false;

  public readonly moduleBundleQueue: string[] = [];

  constructor(modules: (ESTree.Expression | ESTree.SpreadElement)[]) {
    this.modules = modules;
  }

  get detectedGlobals(): DetectedGlobals {
    return this._detectedGlobals;
  }

  get wrappedModules(): { [name: string]: WrappedModule } {
    return this._wrappedModules;
  }

  public getAndIncrementModuleIndex(): number {
    return this._nextModuleIndex++;
  }

  public save(): any {
    return {
      detectedGlobals: this._detectedGlobals,
      wrappedModules: Object.keys(this._wrappedModules).map(name => {
          const wrappedModule = this._wrappedModules[name];
          return {
            index: wrappedModule.index,
            name: wrappedModule.name,
            remove: wrappedModule.remove,
            mtime: wrappedModule.mtime
          };
        }),
      nextModuleIndex: this._nextModuleIndex
    };
  }

  public load(context: PaeckchenContext, data: any): Promise<void> {
    return Promise.resolve()
      .then(() => {
        this._detectedGlobals = data.detectedGlobals;
        this._wrappedModules = data.wrappedModules
          .reduce((wrappedModules: { [name: string]: WrappedModule }, entry: any) => {
            const wrapped = {
              index: entry.index,
              name: entry.name,
              remove: entry.remove,
              mtime: entry.mtime || -1
            } as WrappedModule;
            wrapped.ast = this.modules[entry.index];
            wrappedModules[entry.name] = wrapped;
            return wrappedModules;
          }, {}) as any;
        this._nextModuleIndex = data.nextModuleIndex;
      })
      .then(() => this.revalidate(context));
  }

  private revalidate(context: PaeckchenContext): Promise<void> {
    return Promise.resolve()
      .then(() => {
        const files = Object.keys(this._wrappedModules);
        const exists = files.map(file => context.host.fileExists(file));
        return Promise.all(files.map((file, index) => exists[index] ? context.host.getModificationTime(file) : -1))
          .then(mtimes => {
            files.forEach((file, index) => {
              const wrappedModule = this._wrappedModules[file];
              if (!exists[index]) {
                updateModule(wrappedModule.name, true, this);
                enqueueModule(wrappedModule.name, this, context);
              } else if (wrappedModule.mtime < mtimes[index]) {
                updateModule(wrappedModule.name, false, this);
                enqueueModule(wrappedModule.name, this, context);
              }
            });
          });
      });
  }

}

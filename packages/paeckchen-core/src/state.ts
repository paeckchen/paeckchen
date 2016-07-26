import { DetectedGlobals } from './globals';

export interface WrappedModule {
  index: number;
  name: string;
  ast?: ESTree.Statement;
  remove: boolean;
}

export class State {

  public readonly detectedGlobals: DetectedGlobals = {
    global: false,
    process: false,
    buffer: false
  };

  public readonly modules: (ESTree.Expression | ESTree.SpreadElement)[];

  public readonly wrappedModules: { [name: string]: WrappedModule } = {};

  private _nextModuleIndex: number = 0;

  public moduleWatchCallbackAdded: boolean = false;

  public readonly moduleBundleQueue: string[] = [];

  constructor(data: (ESTree.Expression | ESTree.SpreadElement)[] | any,
      modules?: (ESTree.Expression | ESTree.SpreadElement)[]) {
    if (Array.isArray(data)) {
      this.modules = data;
    } else if (modules !== undefined) {
      // Recreate from cache
      this.modules = modules;
      this.detectedGlobals = data.detectedGlobals;
      this.wrappedModules = data.wrappedModules
        .reduce((wrappedModules: { [name: string]: WrappedModule }, entry: any) => {
          const wrapped = {
            index: entry.index,
            name: entry.name,
            remove: entry.remove
          } as WrappedModule;
          if (modules !== undefined) {
            wrapped.ast = modules[entry.index];
          }
          wrappedModules[entry.name] = wrapped;
          return wrappedModules;
        }, {}) as any;
      this._nextModuleIndex = data.nextModuleIndex;
    }
  }

  public getAndIncrementModuleIndex(): number {
    return this._nextModuleIndex++;
  }

  public serialize(): any {
    return {
      detectedGlobals: this.detectedGlobals,
      wrappedModules: Object.keys(this.wrappedModules).map(name => {
          return {
            index: this.wrappedModules[name].index,
            name: this.wrappedModules[name].name,
            remove: this.wrappedModules[name].remove
          };
        }),
      nextModuleIndex: this._nextModuleIndex
    };
  }
}

import * as ESTree from 'estree';

import { PaeckchenContext } from './bundle';
import { DetectedGlobals } from './globals';
import { updateModule, enqueueModule } from './modules';

export interface WrappedModule {
  index: number;
  name: string;
  ast?: ESTree.Expression|ESTree.SpreadElement;
  remove: boolean;
  mtime: number;
}

export class State {

  private _detectedGlobals: DetectedGlobals = {
    global: false,
    process: false,
    buffer: false
  };

  public readonly modules: (ESTree.Expression|ESTree.SpreadElement)[];

  private _wrappedModules: { [name: string]: WrappedModule } = {};

  private _nextModuleIndex: number = 0;

  public moduleWatchCallbackAdded: boolean = false;

  public readonly moduleBundleQueue: string[] = [];

  constructor(modules: (ESTree.Expression|ESTree.SpreadElement)[]) {
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
      wrappedModules: Object.keys(this._wrappedModules).map(name => this.saveWrappedModule(this._wrappedModules[name])),
      nextModuleIndex: this._nextModuleIndex
    };
  }

  private saveWrappedModule(wrappedModule: WrappedModule): any {
    return {
      index: wrappedModule.index,
      name: wrappedModule.name,
      remove: wrappedModule.remove,
      mtime: wrappedModule.mtime
    };
  }

  public async load(context: PaeckchenContext, data: any, updateModuleFn = updateModule,
      enqueueModuleFn = enqueueModule): Promise<void> {
    this._detectedGlobals = data.detectedGlobals;
    this._wrappedModules = data.wrappedModules
      .reduce((wrappedModules: { [name: string]: WrappedModule }, entry: any) => {
        const wrapped = this.loadWrappedModule(entry);
        wrapped.ast = this.modules[entry.index];
        wrappedModules[entry.name] = wrapped;
        return wrappedModules;
      }, {}) as any;
    this._nextModuleIndex = data.nextModuleIndex;
    await this.revalidate(context, updateModuleFn, enqueueModuleFn);
  }

  private loadWrappedModule(data: any): WrappedModule {
    return {
      index: data.index,
      name: data.name,
      remove: data.remove,
      mtime: data.mtime || -1
    };
  }

  private async revalidate(context: PaeckchenContext, updateModuleFn: typeof updateModule,
      enqueueModuleFn: typeof enqueueModule): Promise<void> {
    const files = Object.keys(this._wrappedModules);
    const exists = files.map(file => context.host.fileExists(file));
    const mtimes = await Promise.all(files.map((file, index) => {
      return exists[index] ? context.host.getModificationTime(file) : -1;
    }));
    files.forEach((file, index) => {
      const wrappedModule = this._wrappedModules[file];
      if (!exists[index]) {
        updateModuleFn(wrappedModule.name, true, this);
        enqueueModuleFn(wrappedModule.name, this, context);
      } else if (wrappedModule.mtime < mtimes[index]) {
        updateModuleFn(wrappedModule.name, false, this);
        enqueueModuleFn(wrappedModule.name, this, context);
      }
    });
  }

}

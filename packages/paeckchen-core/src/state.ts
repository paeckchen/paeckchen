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

  constructor(modules: (ESTree.Expression | ESTree.SpreadElement)[]) {
    this.modules = modules;
  }

  public getAndIncrementModuleIndex(): number {
    return this._nextModuleIndex++;
  }

}

import { IPaeckchenContext } from '../bundle';
import { State } from '../state';

export interface Plugins {
  [name: string]: (program: ESTree.Program, currentModule: string, context: IPaeckchenContext,
    state: State) => Promise<void>;
}

export { rewriteImportDeclaration } from './es6-import';
export { rewriteExportNamedDeclaration } from './es6-export';
export { rewriteRequireStatements } from './commonjs';
export { rewriteGlobalLocals } from './global-locals';

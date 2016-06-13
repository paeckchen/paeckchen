export interface IPlugin {
  (program: ESTree.Program, moduleName: string, modules: (ESTree.Expression | ESTree.SpreadElement)[]): void;
}
export { rewriteImportDeclaration } from './es6-import';
export { rewriteExportNamedDeclaration } from './es6-export';

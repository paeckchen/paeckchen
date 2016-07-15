import { visit, IPath } from 'ast-types';

import { IPaeckchenContext } from '../bundle';

export function astFixes(program: ESTree.Program, currentModule: string, context: IPaeckchenContext): void {
  visit(program, {
    visitReturnStatement(path: IPath<ESTree.ReturnStatement>): void {
      if (path.node.argument && (path.node.argument as any).leadingComments) {
        // escodegen inserts a newline which results in incorrect code
        // e.g.
        //
        // This code:
        // return /* */ function() {}
        //
        // Gets transformed to this:
        // return /* */
        // function() {}
        //
        // Therefore we need to remove the comment
        delete (path.node.argument as any).leadingComments;
      }
      this.traverse(path);
    }
  });
}

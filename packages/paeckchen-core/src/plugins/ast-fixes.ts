import { visit, IPath, IVisitor } from 'ast-types';

export function astFixes(program: ESTree.Program): void {
  visit(program, {
    visitReturnStatement(this: IVisitor, path: IPath<ESTree.ReturnStatement>): void {
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

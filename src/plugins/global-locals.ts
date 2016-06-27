import { visit, builders as b, IPath } from 'ast-types';

import { IHost } from '../host';

export function rewriteGlobalLocals(program: ESTree.Program, currentModule: string, host: IHost): void {
  let detectedFilename = false;
  let detectedDirname = false;
  visit(program, {
    visitIdentifier: function(path: IPath<ESTree.Identifier>): void {
      if (path.node.name === '__filename' && path.scope.lookup('__filename') === null) {
        detectedFilename = true;
        if (detectedFilename && detectedDirname) {
          this.abort();
        }
      } else if (path.node.name === '__dirname' && path.scope.lookup('__dirname') === null) {
        detectedDirname = true;
        if (detectedFilename && detectedDirname) {
          this.abort();
        }
      }
      this.traverse(path);
    }
  });

  if (detectedFilename || detectedDirname) {
    program.body = [
      b.expressionStatement(
        b.callExpression(
          b.functionExpression(
            null,
            [
              b.identifier('__filename'),
              b.identifier('__dirname')
            ],
            b.blockStatement(
              program.body
            )
          ),
          [
            b.literal(currentModule.substring(host.cwd().length)),
            b.literal(host.dirname(currentModule).substring(host.cwd().length))
          ]
        )
      )
    ];
  }
}

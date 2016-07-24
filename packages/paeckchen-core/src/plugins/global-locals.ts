import { dirname } from 'path';
import { visit, builders as b, IPath, IVisitor } from 'ast-types';

import { IPaeckchenContext } from '../bundle';

export function rewriteGlobalLocals(program: ESTree.Program, currentModule: string,
    context: IPaeckchenContext): Promise<void> {
  return Promise.resolve()
    .then(() => {
      context.logger.trace('plugin', `rewriteGlobalLocals [currentModule=${currentModule}]`);
    })
    .then(() => {
      let detectedFilename = false;
      let detectedDirname = false;
      visit(program, {
        visitIdentifier: function(this: IVisitor, path: IPath<ESTree.Identifier>): void {
          if (path.node.name === '__filename' && path.scope.lookup('__filename') === null) {
            detectedFilename = true;
          } else if (path.node.name === '__dirname' && path.scope.lookup('__dirname') === null) {
            detectedDirname = true;
          }
          if (detectedFilename && detectedDirname) {
            this.abort();
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
                b.literal(currentModule),
                b.literal(dirname(currentModule))
              ]
            )
          )
        ];
      }
    });
}

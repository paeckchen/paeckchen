import { visit, builders as b, Path, Visitor } from 'ast-types';
import * as ESTree from 'estree';
import { dirname } from 'path';

import { PaeckchenContext } from '../bundle';

export async function rewriteGlobalLocals(program: ESTree.Program, currentModule: string,
    context: PaeckchenContext): Promise<void> {
  context.logger.trace('plugin', `rewriteGlobalLocals [currentModule=${currentModule}]`);

  let detectedFilename = false;
  let detectedDirname = false;

  const isKnownSymbol = (path: Path<ESTree.Identifier>, name: string) =>
    path.node.name === name && path.scope.lookup(name) === null;

  visit(program, {
    visitIdentifier(this: Visitor, path: Path<ESTree.Identifier>): void {
      if (isKnownSymbol(path, '__filename')) {
        detectedFilename = true;
      } else if (isKnownSymbol(path, '__dirname')) {
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
              program.body as ESTree.Statement[]
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
}

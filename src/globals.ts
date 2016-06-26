import { visit, builders as b, IPath } from 'ast-types';

export interface IDetectedGlobals {
  process: boolean;
};

export function checkProcess(ast: ESTree.Program): boolean {
  let detectedProcess = false;
  visit(ast, {
    visitIdentifier: function(path: IPath<ESTree.Identifier>): void {
      if (path.node.name === 'process' && path.scope.lookup('process') === null) {
        detectedProcess = true;
        this.abort();
      }
      this.traverse(path);
    }
  });
  return detectedProcess;
}

export function checkGlobals(detectedGlobals: IDetectedGlobals, ast: ESTree.Program): void {
  detectedGlobals.process = checkProcess(ast);
}

export function injectGlobals(detectedGlobals: IDetectedGlobals, ast: ESTree.Program): void {
  if (detectedGlobals.process) {
    visit(ast, {
      visitProgram: function(path: IPath<ESTree.Program>): boolean {
        if (path.scope.lookup('process') === null) {
          path.get('body', 0).insertBefore(
            b.variableDeclaration(
              'var',
              [
                b.variableDeclarator(
                  b.identifier('process'),
                  b.objectExpression(
                    [
                      b.property(
                        'init',
                        b.identifier('env'),
                        b.objectExpression([])
                      )
                    ]
                  )
                )
              ]
            )
          );
        }
        return false;
      }
    });
  }
}

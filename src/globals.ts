import { visit, builders as b, IPath } from 'ast-types';

export interface IDetectedGlobals {
  global: boolean;
  process: boolean;
};

export function checkGlobalIdentifier(name: string, ast: ESTree.Program): boolean {
  let detectedGlobalIdentifier = false;
  visit(ast, {
    visitIdentifier: function(path: IPath<ESTree.Identifier>): void {
      if (path.node.name === name && path.scope.lookup(name) === null) {
        detectedGlobalIdentifier = true;
        this.abort();
      }
      this.traverse(path);
    }
  });
  return detectedGlobalIdentifier;
}

export function checkGlobals(detectedGlobals: IDetectedGlobals, ast: ESTree.Program): void {
  detectedGlobals.global = detectedGlobals.global || checkGlobalIdentifier('global', ast);
  detectedGlobals.process = detectedGlobals.process || checkGlobalIdentifier('process', ast);
}

export function injectGlobal(ast: ESTree.Program): void {
  visit(ast, {
    visitProgram: function(path: IPath<ESTree.Program>): boolean {
      if (path.scope.lookup('global') === null) {
        path.get('body', 0).insertBefore(
          b.variableDeclaration(
            'var',
            [
              b.variableDeclarator(
                b.identifier('global'),
                b.thisExpression()
              )
            ]
          )
        );
      }
      return false;
    }
  });
}

export function injectProcess(ast: ESTree.Program): void {
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

export function injectGlobals(detectedGlobals: IDetectedGlobals, ast: ESTree.Program): void {
  if (detectedGlobals.global) {
    injectGlobal(ast);
  }
  if (detectedGlobals.process) {
    injectProcess(ast);
  }
}

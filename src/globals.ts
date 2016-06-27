import { visit, builders as b, IPath } from 'ast-types';
import { getModulePath } from './module-path';
import { getModuleIndex, enqueueModule } from './modules';
import { IHost } from './host';

export interface IDetectedGlobals {
  global: boolean;
  process: boolean;
  buffer: boolean;
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
  detectedGlobals.buffer = detectedGlobals.buffer || checkGlobalIdentifier('Buffer', ast);
}

function injectGlobal(ast: ESTree.Program): void {
  visit(ast, {
    visitProgram: function(path: IPath<ESTree.Program>): boolean {
      if (path.scope.lookup('global') === null) {
        const body = path.get<ESTree.Statement[]>('body');
        body.get(body.value.length - 1).insertBefore(
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

function injectProcess(ast: ESTree.Program): void {
  visit(ast, {
    visitProgram: function(path: IPath<ESTree.Program>): boolean {
      if (path.scope.lookup('process') === null) {
        const body = path.get<ESTree.Statement[]>('body');
        body.get(body.value.length - 1).insertBefore(
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

function injectBuffer(ast: ESTree.Program, host: IHost): void {
  visit(ast, {
    visitProgram: function(path: IPath<ESTree.Program>): boolean {
      if (path.scope.lookup('Buffer') === null) {
        const bufferPath = getModulePath('.', 'buffer', host);
        const bufferIndex = getModuleIndex(bufferPath);

        const body = path.get<ESTree.Statement[]>('body');
        body.get(body.value.length - 1).insertBefore(
          b.variableDeclaration(
            'var',
            [
              b.variableDeclarator(
                b.identifier('Buffer'),
                b.memberExpression(
                  b.callExpression(
                    b.identifier('__paeckchen_require__'),
                    [
                      b.literal(bufferIndex)
                    ]
                  ),
                  b.identifier('exports'),
                  false
                )
              )
            ]
          )
        );
        enqueueModule(bufferPath);
      }
      return false;
    }
  });
}

export function injectGlobals(detectedGlobals: IDetectedGlobals, ast: ESTree.Program, host: IHost): void {
  if (detectedGlobals.global) {
    injectGlobal(ast);
  }
  if (detectedGlobals.process) {
    injectProcess(ast);
  }
  if (detectedGlobals.buffer) {
    injectBuffer(ast, host);
  }
}

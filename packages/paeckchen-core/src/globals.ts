import { visit, builders as b, IPath, IVisitor } from 'ast-types';
import { getModulePath } from './module-path';
import { getModuleIndex, enqueueModule } from './modules';
import { IPaeckchenContext } from './bundle';
import { State } from './state';

export interface IDetectedGlobals {
  global: boolean;
  process: boolean;
  buffer: boolean;
};

export function checkGlobalIdentifier(name: string, ast: ESTree.Program): boolean {
  let detectedGlobalIdentifier = false;
  visit(ast, {
    visitIdentifier: function(this: IVisitor, path: IPath<ESTree.Identifier>): void {
      if (path.node.name === name && path.scope.lookup(name) === null) {
        detectedGlobalIdentifier = true;
        this.abort();
      }
      this.traverse(path);
    }
  });
  return detectedGlobalIdentifier;
}

export function checkGlobals(state: State, ast: ESTree.Program): void {
  state.detectedGlobals.global = state.detectedGlobals.global || checkGlobalIdentifier('global', ast);
  state.detectedGlobals.process = state.detectedGlobals.process || checkGlobalIdentifier('process', ast);
  state.detectedGlobals.buffer = state.detectedGlobals.buffer || checkGlobalIdentifier('Buffer', ast);
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

function injectProcess(ast: ESTree.Program, context: IPaeckchenContext, state: State): void {
  visit(ast, {
    visitProgram: function(path: IPath<ESTree.Program>): boolean {
      if (path.scope.lookup('process') === null) {
        const processPath = getModulePath('.', 'process', context);
        const processIndex = getModuleIndex(processPath, state);

        const body = path.get<ESTree.Statement[]>('body');
        body.get(body.value.length - 1).insertBefore(
          b.variableDeclaration(
            'var',
            [
              b.variableDeclarator(
                b.identifier('process'),
                b.memberExpression(
                  b.callExpression(
                    b.identifier('__paeckchen_require__'),
                    [
                      b.literal(processIndex)
                    ]
                  ),
                  b.identifier('exports'),
                  false
                )
              )
            ]
          )
        );
        enqueueModule(processPath, state);
      }
      return false;
    }
  });
}

function injectBuffer(ast: ESTree.Program, context: IPaeckchenContext, state: State): void {
  visit(ast, {
    visitProgram: function(path: IPath<ESTree.Program>): boolean {
      if (path.scope.lookup('Buffer') === null) {
        const bufferPath = getModulePath('.', 'buffer', context);
        const bufferIndex = getModuleIndex(bufferPath, state);

        const body = path.get<ESTree.Statement[]>('body');
        body.get(body.value.length - 1).insertBefore(
          b.variableDeclaration(
            'var',
            [
              b.variableDeclarator(
                b.identifier('Buffer'),
                b.memberExpression(
                  b.memberExpression(
                    b.callExpression(
                      b.identifier('__paeckchen_require__'),
                      [
                        b.literal(bufferIndex)
                      ]
                    ),
                    b.identifier('exports'),
                    false
                  ),
                  b.identifier('Buffer'),
                  false
                )
              )
            ]
          )
        );
        enqueueModule(bufferPath, state);
      }
      return false;
    }
  });
}

export function injectGlobals(state: State, ast: ESTree.Program,
    context: IPaeckchenContext): void {
  if (state.detectedGlobals.global) {
    injectGlobal(ast);
  }
  if (state.detectedGlobals.process) {
    injectProcess(ast, context, state);
  }
  if (state.detectedGlobals.buffer) {
    injectBuffer(ast, context, state);
  }
}

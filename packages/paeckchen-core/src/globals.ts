import { visit, builders as b, Path, Visitor } from 'ast-types';
import { getModulePath } from './module-path';
import { getModuleIndex, enqueueModule } from './modules';
import { PaeckchenContext } from './bundle';
import { State } from './state';

export interface DetectedGlobals {
  global: boolean;
  process: boolean;
  buffer: boolean;
};

export function checkGlobalIdentifier(name: string, ast: ESTree.Program): boolean {
  let detectedGlobalIdentifier = false;
  visit(ast, {
    visitIdentifier: function(this: Visitor, path: Path<ESTree.Identifier>): void {
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

function injectGlobal(ast: ESTree.Program): Promise<void> {
  return Promise.resolve()
    .then(() => {
      visit(ast, {
        visitProgram: function(path: Path<ESTree.Program>): boolean {
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
  });
}

function injectProcess(ast: ESTree.Program, context: PaeckchenContext, state: State): Promise<void> {
  return Promise.resolve()
    .then(() => {
      let processPath: Path<ESTree.Program>|undefined = undefined;

      visit(ast, {
        visitProgram: function(path: Path<ESTree.Program>): boolean {
          if (path.scope.lookup('process') === null) {
            processPath = path;
          }
          return false;
        }
      });

      if (processPath === undefined) {
        return Promise.resolve();
      }
      return getModulePath('.', 'process', context)
        .then(processModulePath => {
          const processIndex = getModuleIndex(processModulePath, state);

          if (processPath !== undefined) {
            const body = processPath.get<ESTree.Statement[]>('body');
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
            enqueueModule(processModulePath, state, context);
          }
        });
    });
}

function injectBuffer(ast: ESTree.Program, context: PaeckchenContext, state: State): Promise<void> {
  return Promise.resolve()
    .then(() => {
      let bufferPath: Path<ESTree.Program>|undefined = undefined;

      visit(ast, {
        visitProgram: function(path: Path<ESTree.Program>): boolean {
          if (path.scope.lookup('Buffer') === null) {
            bufferPath = path;
          }
          return false;
        }
      });

      if (bufferPath === undefined) {
        return Promise.resolve();
      }
      return getModulePath('.', 'buffer', context)
        .then(bufferModulePath => {
          const bufferIndex = getModuleIndex(bufferModulePath, state);

          if (bufferPath !== undefined) {
            const body = bufferPath.get<ESTree.Statement[]>('body');
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
            enqueueModule(bufferModulePath, state, context);
          }
        });
    });
}

export function injectGlobals(state: State, ast: ESTree.Program,
    context: PaeckchenContext): Promise<void> {
  return Promise.resolve()
    .then((): any => {
      if (state.detectedGlobals.global) {
        return injectGlobal(ast);
      }
    })
    .then((): any => {
      if (state.detectedGlobals.process) {
        return injectProcess(ast, context, state);
      }
    })
    .then((): any => {
      if (state.detectedGlobals.buffer) {
        return injectBuffer(ast, context, state);
      }
    });
}

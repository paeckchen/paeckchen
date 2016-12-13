import { builders as b, Path, visit, Visitor } from 'ast-types';
import * as ESTree from 'estree';

import { PaeckchenContext } from './bundle';
import { getModulePath } from './module-path';
import { enqueueModule, getModuleIndex } from './modules';
import { State } from './state';

export interface DetectedGlobals {
  global: boolean;
  process: boolean;
  buffer: boolean;
};

export function checkGlobalIdentifier(name: string, ast: ESTree.Program): boolean {
  let detectedGlobalIdentifier = false;
  visit(ast, {
    visitIdentifier(this: Visitor, path: Path<ESTree.Identifier>): void {
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

async function injectGlobal(ast: ESTree.Program): Promise<void> {
  visit(ast, {
    visitProgram(path: Path<ESTree.Program>): boolean {
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

async function injectProcess(ast: ESTree.Program, context: PaeckchenContext, state: State): Promise<void> {
  let processPath: Path<ESTree.Program>|undefined;

  visit(ast, {
    visitProgram(path: Path<ESTree.Program>): boolean {
      if (path.scope.lookup('process') === null) {
        processPath = path;
      }
      return false;
    }
  });

  if (processPath === undefined) {
    return Promise.resolve();
  }

  const processModulePath = await getModulePath('.', 'process', context);
  const processIndex = getModuleIndex(processModulePath, state);
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

async function injectBuffer(ast: ESTree.Program, context: PaeckchenContext, state: State): Promise<void> {
  let bufferPath: Path<ESTree.Program>|undefined;

  visit(ast, {
    visitProgram(path: Path<ESTree.Program>): boolean {
      if (path.scope.lookup('Buffer') === null) {
        bufferPath = path;
      }
      return false;
    }
  });

  if (bufferPath === undefined) {
    return Promise.resolve();
  }
  const bufferModulePath = await getModulePath('.', 'buffer', context);
  const bufferIndex = getModuleIndex(bufferModulePath, state);
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

export async function injectGlobals(state: State, ast: ESTree.Program,
    context: PaeckchenContext): Promise<void> {
  if (state.detectedGlobals.global) {
    await injectGlobal(ast);
  }
  if (state.detectedGlobals.process) {
    await injectProcess(ast, context, state);
  }
  if (state.detectedGlobals.buffer) {
    await injectBuffer(ast, context, state);
  }
}

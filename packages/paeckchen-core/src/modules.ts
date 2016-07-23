import { parse } from 'acorn';
import { builders as b } from 'ast-types';

import { IPaeckchenContext } from './bundle';
import * as defaultPlugins from './plugins';
import { checkGlobals } from './globals';
import { IWrappedModule, State } from './state';
import { wrapJsonFile } from './bundle-json';

export function getModuleIndex(moduleName: string, state: State): number {
  if (state.wrappedModules[moduleName]) {
    return state.wrappedModules[moduleName].index;
  }
  const index = state.getAndIncrementModuleIndex();
  state.wrappedModules[moduleName] = {
    index,
    name: moduleName,
    remove: false
  };
  return index;
}

export function updateModule(moduleName: string, remove: boolean, state: State): void {
  if (state.wrappedModules[moduleName]) {
    state.wrappedModules[moduleName].ast = undefined;
    state.wrappedModules[moduleName].remove = remove;
  }
}

function createModuleWrapper(name: string, moduleAst: ESTree.Program, state: State): IWrappedModule {
  const index = getModuleIndex(name, state);
  return {
    index,
    name,
    ast: b.functionExpression(
      b.identifier(`_${index}`),
      [
        b.identifier('module'),
        b.identifier('exports')
      ],
      b.blockStatement(
        moduleAst.body
      )
    ),
    remove: false
  };
}

export function enqueueModule(modulePath: string, state: State): void {
  if (state.moduleBundleQueue.indexOf(modulePath) === -1) {
    state.moduleBundleQueue.push(modulePath);
  }
}

export function bundleNextModule(state: State, context: IPaeckchenContext, plugins: any = defaultPlugins): boolean {
  if (state.moduleBundleQueue.length === 0) {
    return false;
  }
  const modulePath = state.moduleBundleQueue.shift() as string;
  watchModule(state, modulePath, context);
  wrapModule(modulePath, state, context, plugins);
  return true;
}

function watchModule(state: State, modulePath: string, context: IPaeckchenContext): void {
  if (context.config.watchMode) {
    if (!state.moduleWatchCallbackAdded) {
      state.moduleWatchCallbackAdded = true;
      if (context.watcher) {
        context.watcher.start((event) => {
          let rebundle = false;
          if (event === 'update') {
            updateModule(modulePath, false, state);
            enqueueModule(modulePath, state);
            rebundle = true;
          } else if (event === 'remove') {
            updateModule(modulePath, true, state);
            enqueueModule(modulePath, state);
            rebundle = true;
          }
          if (rebundle && context.rebundle) {
            context.rebundle();
          }
        });
      }
    }
    if (context.watcher) {
      context.watcher.watchFile(modulePath);
    }
  }
}

function wrapModule(modulePath: string, state: State, context: IPaeckchenContext, plugins: any): void {
  // Prefill module indices
  const moduleIndex = getModuleIndex(modulePath, state);
  if (state.wrappedModules[modulePath].ast !== undefined) {
    // Module is already up to date
    return;
  }

  try {
    let moduleAst: ESTree.Program|undefined = undefined;
    if (!state.wrappedModules[modulePath].remove) {
      if (Object.keys(context.config.externals).indexOf(modulePath) !== -1) {
        moduleAst = wrapExternalModule(modulePath, context);
      } else if (!context.host.fileExists(modulePath)) {
        moduleAst = b.program([
          b.throwStatement(
            b.newExpression(
              b.identifier('Error'),
              [
                b.literal(`Module '${modulePath}' not found`)
              ]
            )
          )
        ]);
      } else if (modulePath.match(/\.json$/)) {
        moduleAst = wrapJsonFile(modulePath, context);
      } else {
        moduleAst = processModule(modulePath, context, state, plugins);
      }
      state.wrappedModules[modulePath] = createModuleWrapper(modulePath, moduleAst, state);
      state.modules[moduleIndex] = state.wrappedModules[modulePath].ast as ESTree.Statement;
    } else {
      state.modules[moduleIndex] = b.throwStatement(
        b.newExpression(
          b.identifier('Error'),
          [
            b.literal(`Module '${modulePath}' was removed`)
          ]
        )
      );
    }
  } catch (e) {
    context.logger.error('modules', e, `Failed to process module '${modulePath}'`);
    throw e;
  }
}

function wrapExternalModule(modulePath: string, context: IPaeckchenContext): ESTree.Program {
  const external = context.config.externals[modulePath] === false
    ? b.objectExpression([])
    : b.identifier(context.config.externals[modulePath] as string);
  return b.program([
    b.expressionStatement(
      b.assignmentExpression(
        '=',
        b.memberExpression(
          b.identifier('module'),
          b.identifier('exports'),
          false
        ),
        external
      )
    )
  ]);
}

function processModule(modulePath: string, context: IPaeckchenContext, state: State,
    plugins: any): ESTree.Program {
  // parse...
  const moduleAst = parse(context.host.readFile(modulePath).toString(), {
    ecmaVersion: 7,
    sourceType: 'module',
    locations: true,
    ranges: true,
    sourceFile: modulePath,
    allowHashBang: true
  });

  // ... check for global features...
  checkGlobals(state, moduleAst);

  // ... and rewrite ast
  Object.keys(plugins).forEach(plugin => {
    plugins[plugin](moduleAst, modulePath, context, state);
  });

  return moduleAst;
}

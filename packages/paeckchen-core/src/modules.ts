import { parse } from 'acorn';
import { builders as b } from 'ast-types';
import * as ESTree from 'estree';

import { PaeckchenContext } from './bundle';
import { wrapJsonFile } from './bundle-json';
import { checkGlobals } from './globals';
import * as defaultPlugins from './plugins';
import { Plugins } from './plugins';
import { WrappedModule, State } from './state';

export function getModuleIndex(moduleName: string, state: State): number {
  if (state.wrappedModules[moduleName]) {
    return state.wrappedModules[moduleName].index;
  }
  const index = state.getAndIncrementModuleIndex();
  state.wrappedModules[moduleName] = {
    index,
    name: moduleName,
    remove: false,
    mtime: -1
  };
  return index;
}

export function updateModule(moduleName: string, remove: boolean, state: State): void {
  if (state.wrappedModules[moduleName]) {
    state.wrappedModules[moduleName].ast = undefined;
    state.wrappedModules[moduleName].remove = remove;
  }
}

async function createModuleWrapper(context: PaeckchenContext, name: string, moduleAst: ESTree.Program,
    state: State): Promise<WrappedModule> {
  context.logger.trace('module', `createModuleWrapper [name=${name}]`);
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
        moduleAst.body as ESTree.Statement[]
      )
    ),
    remove: false,
    mtime: await context.host.getModificationTime(name)
  };
}

export function enqueueModule(modulePath: string, state: State, context: PaeckchenContext): void {
  context.logger.trace('module', `enqueueModule [modulePath=${modulePath}]`);
  if (state.moduleBundleQueue.indexOf(modulePath) === -1) {
    state.moduleBundleQueue.push(modulePath);
  }
}

export function bundleNextModules(state: State, context: PaeckchenContext,
    plugins: any = defaultPlugins): Promise<void>[] {
  if (state.moduleBundleQueue.length === 0) {
    return [];
  }
  const modules = state.moduleBundleQueue.splice(0, 4);
  return modules.map(async modulePath => {
    context.logger.debug('module', `bundle ${modulePath}`);
    await watchModule(state, modulePath, context);
    await wrapModule(modulePath, state, context, plugins);
  });
}

async function watchModule(state: State, modulePath: string, context: PaeckchenContext): Promise<void> {
  if (context.config.watchMode) {
    context.logger.trace('module', `watchModule [modulePath=${modulePath}]`);

    if (!state.moduleWatchCallbackAdded) {
      state.moduleWatchCallbackAdded = true;
      if (context.watcher) {
        context.watcher.start((event, fileName) => {
          let rebundle = false;
          if (event === 'update') {
            context.logger.trace('watch', `update [modulePath=${fileName}]`);
            updateModule(fileName, false, state);
            enqueueModule(fileName, state, context);
            rebundle = true;
          } else if (event === 'remove') {
            context.logger.trace('watch', `remove [modulePath=${fileName}]`);
            updateModule(fileName, true, state);
            enqueueModule(fileName, state, context);
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

async function wrapModule(modulePath: string, state: State, context: PaeckchenContext, plugins: any): Promise<void> {
  context.logger.trace('module', `wrapModule [modulePath=${modulePath}]`);
  // prefill index
  getModuleIndex(modulePath, state);
  const upToDate = state.wrappedModules[modulePath].ast !== undefined;
  if (!upToDate) {
    try {
      let ast;
      if (!state.wrappedModules[modulePath].remove) {
        ast = await createModuleProgram(context, modulePath, state, plugins);
      } else {
        ast = await wrapThrowOnRemovedModule(modulePath);
      }
      const wrappedModule = await createModuleWrapper(context, modulePath, ast, state);
      state.wrappedModules[modulePath] = wrappedModule;
      const moduleAst = state.wrappedModules[modulePath].ast!;
      const moduleIndex = getModuleIndex(modulePath, state);
      state.modules[moduleIndex] = moduleAst;
    } catch (e) {
      context.logger.error('module', e, `Failed to process module '${modulePath}'`);
      throw e;
    }
  } else {
    context.logger.trace('module', `wrapModule; upToDate [modulePath=${modulePath}]`);
  }
}

async function createModuleProgram(context: PaeckchenContext, modulePath: string, state: State,
    plugins: any): Promise<ESTree.Program> {
  if (Object.keys(context.config.externals).indexOf(modulePath) !== -1) {
    return wrapExternalModule(modulePath, context);
  } else if (!context.host.fileExists(modulePath)) {
    return wrapMissingModule(modulePath);
  } else if (modulePath.match(/\.json$/)) {
    return wrapJsonFile(modulePath, context);
  } else {
    return processModule(modulePath, context, state, plugins);
  }
}

function wrapMissingModule(modulePath: string): Promise<ESTree.Program> {
  return Promise.resolve(b.program([
    b.throwStatement(
      b.newExpression(
        b.identifier('Error'),
        [
          b.literal(`Module '${modulePath}' not found`)
        ]
      )
    )
  ]));
}

function wrapThrowOnRemovedModule(modulePath: string): Promise<ESTree.Program> {
  return Promise.resolve(b.program([
    b.throwStatement(
      b.newExpression(
        b.identifier('Error'),
        [
          b.literal(`Module '${modulePath}' was removed`)
        ]
      )
    )
  ]));
}

function wrapExternalModule(modulePath: string, context: PaeckchenContext): Promise<ESTree.Program> {
  const external = context.config.externals[modulePath] === false
    ? b.objectExpression([])
    : b.identifier(context.config.externals[modulePath] as string);
  return Promise.resolve(b.program([
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
  ]));
}

async function processModule(modulePath: string, context: PaeckchenContext, state: State,
    plugins: Plugins): Promise<ESTree.Program> {
  context.logger.trace('module', `processModule [modulePath=${modulePath}]`);
  const code = await context.host.readFile(modulePath);
  // parse...
  const moduleAst = parse(code, {
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
  await Promise.all(Object.keys(plugins).map(plugin => {
    return plugins[plugin](moduleAst, modulePath, context, state);
  }));
  return moduleAst;
}

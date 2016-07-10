import { parse } from 'acorn';
import { attachComments } from 'estraverse';
import { builders as b } from 'ast-types';

import { IPaeckchenContext } from './bundle';
import * as defaultPlugins from './plugins';
import { checkGlobals } from './globals';
import { IWrappedModule, State } from './state';

export function getModuleIndex(moduleName: string, state: State): number {
  if (state.wrappedModules[moduleName]) {
    return state.wrappedModules[moduleName].index;
  }
  const index = state.getAndIncrementModuleIndex();
  state.wrappedModules[moduleName] = {
    index,
    name: moduleName
  };
  return index;
}

export function updateModule(moduleName: string, state: State): void {
  if (state.wrappedModules[moduleName]) {
    state.wrappedModules[moduleName].ast = undefined;
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
    )
  };
}

const moduleBundleQueue: string[] = [];
export function enqueueModule(modulePath: string): void {
  if (moduleBundleQueue.indexOf(modulePath) === -1) {
    moduleBundleQueue.push(modulePath);
  }
}

export function bundleNextModule(state: State, context: IPaeckchenContext, plugins: any = defaultPlugins): boolean {
  if (moduleBundleQueue.length === 0) {
    return false;
  }
  const modulePath = moduleBundleQueue.shift();
  wrapModule(modulePath, state, context, plugins);
  return true;
}

function wrapModule(modulePath: string, state: State, context: IPaeckchenContext, plugins: any): void {
  // Prefill module indices
  getModuleIndex(modulePath, state);
  if (state.wrappedModules[modulePath].ast !== undefined) {
    // Module is already up to date
    return;
  }

  try {
    let moduleAst: ESTree.Program;
    if (Object.keys(context.config.externals).indexOf(modulePath) !== -1) {
      moduleAst = wrapExternalModule(modulePath, context);
    } else if (!context.host.fileExists(modulePath)) {
      moduleAst = b.program([
        b.throwStatement(
          b.literal(`Module ${modulePath} not found`)
        )
      ]);
    } else {
      moduleAst = processModule(modulePath, context, state, plugins);
    }

    const wrappedModule = createModuleWrapper(modulePath, moduleAst, state);
    state.wrappedModules[wrappedModule.name] = wrappedModule;
    state.modules[wrappedModule.index] = wrappedModule.ast;
  } catch (e) {
    console.error(`Failed to process module '${modulePath}'`);
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
  const comments: any[] = [];
  const tokens: any[] = [];
  const moduleAst = parse(context.host.readFile(modulePath).toString(), {
    ecmaVersion: 7,
    sourceType: 'module',
    locations: true,
    ranges: true,
    allowHashBang: true,
    onComment: comments,
    onToken: tokens
  });
  // only attach comments which are not sourceMaps
  attachComments(moduleAst,
    comments.filter((comment: any) => comment.value.indexOf('# sourceMappingURL=') === -1), tokens);

  // ... check for global features...
  checkGlobals(state, moduleAst);

  // ... and rewrite ast
  Object.keys(plugins).forEach(plugin => {
    plugins[plugin](moduleAst, modulePath, context, state);
  });

  return moduleAst;
}

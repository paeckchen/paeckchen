import { parse } from 'acorn';
import { attachComments } from 'estraverse';
import { builders as b } from 'ast-types';

import { IPaeckchenContext } from './bundle';
import * as defaultPlugins from './plugins';
import { checkGlobals, IDetectedGlobals } from './globals';

interface IWrappedModule {
  index: number;
  name: string;
  ast?: ESTree.Statement;
}

const wrappedModules: {[name: string]: IWrappedModule} = {};
let nextModuleIndex = 0;
let watchCallbackAdded = false;

/*
 * This function is for testing purpose and a big code smell.
 */
export function reset(): void {
  Object.keys(wrappedModules).forEach(key => delete wrappedModules[key]);
  nextModuleIndex = 0;
  watchCallbackAdded = false;
}

export function getModuleIndex(moduleName: string): number {
  if (wrappedModules[moduleName]) {
    return wrappedModules[moduleName].index;
  }
  const index = nextModuleIndex++;
  wrappedModules[moduleName] = {
    index,
    name: moduleName
  };
  return index;
}

export function updateModule(moduleName: string): void {
  if (wrappedModules[moduleName]) {
    wrappedModules[moduleName].ast = undefined;
  }
}

function createModuleWrapper(name: string, moduleAst: ESTree.Program): IWrappedModule {
  const index = getModuleIndex(name);
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

export function bundleNextModule(modules: (ESTree.Expression | ESTree.SpreadElement)[],
    context: IPaeckchenContext, detectedGlobals: IDetectedGlobals, plugins: any = defaultPlugins): boolean {
  if (moduleBundleQueue.length === 0) {
    return false;
  }
  const modulePath = moduleBundleQueue.shift();
  watchModule(modulePath, context);
  wrapModule(modulePath, modules, context, detectedGlobals, plugins);
  return true;
}

function watchModule(modulePath: string, context: IPaeckchenContext): void {
  if (context.config.watchMode) {
    if (!watchCallbackAdded) {
      watchCallbackAdded = true;
      context.watcher.start((event, fileName) => {
        if (event === 'update') {
          updateModule(modulePath);
          enqueueModule(modulePath);
          context.rebundle();
        } else if (event === 'remove') {
          // TODO: Bundle need to be updated
        }
      });
    }
    context.watcher.watchFile(modulePath);
  }
}

function wrapModule(modulePath: string, modules: (ESTree.Expression | ESTree.SpreadElement)[],
    context: IPaeckchenContext, detectedGlobals: IDetectedGlobals, plugins: any): void {
  // Prefill module indices
  getModuleIndex(modulePath);
  if (wrappedModules[modulePath].ast !== undefined) {
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
      moduleAst = processModule(modulePath, context, detectedGlobals, plugins);
    }

    const wrappedModule = createModuleWrapper(modulePath, moduleAst);
    wrappedModules[wrappedModule.name] = wrappedModule;
    modules[wrappedModule.index] = wrappedModule.ast;
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

function processModule(modulePath: string, context: IPaeckchenContext, detectedGlobals: IDetectedGlobals,
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
  checkGlobals(detectedGlobals, moduleAst);

  // ... and rewrite ast
  Object.keys(plugins).forEach(plugin => {
    plugins[plugin](moduleAst, modulePath, context);
  });

  return moduleAst;
}

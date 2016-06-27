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

export function reset(): void {
  Object.keys(wrappedModules).forEach(key => delete wrappedModules[key]);
  nextModuleIndex = 0;
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
  wrapModule(modulePath, modules, context, detectedGlobals, plugins);
  return true;
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
    if (!context.host.fileExists(modulePath)) {
      moduleAst = b.program([
        b.throwStatement(
          b.literal(`Module ${modulePath} not found`)
        )
      ]);
    } else {
      // parse...
      const comments: any[] = [];
      const tokens: any[] = [];
      moduleAst = parse(context.host.readFile(modulePath).toString(), {
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
    }

    const wrappedModule = createModuleWrapper(modulePath, moduleAst);
    wrappedModules[wrappedModule.name] = wrappedModule;
    modules[wrappedModule.index] = wrappedModule.ast;
  } catch (e) {
    console.error(`Failed to process module '${modulePath}'`);
    throw e;
  }
}

import { parse } from 'acorn';
import { attachComments } from 'estraverse';
import { builders as b } from 'ast-types';

import { IHost } from './host';
import * as defaultPlugins from './plugins';

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

function getModuleName(name: string): string {
  return name.replace(/\.js$/, '');
}

export function getModuleIndex(name: string): number {
  const moduleName = getModuleName(name);
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

export function updateModule(name: string): void {
  const moduleName = getModuleName(name);
  if (wrappedModules[moduleName]) {
    wrappedModules[moduleName].ast = undefined;
  }
}

function createModuleWrapper(name: string, moduleAst: ESTree.Program): IWrappedModule {
  function getWrapperBlock(ast: any): ESTree.BlockStatement {
    return (ast as ESTree.FunctionDeclaration).body as ESTree.BlockStatement;
  }

  const index = getModuleIndex(name);
  // TODO: Add relative path as comment
  const wrapperSource = `
    // ${name}
    function _${index}() {
      var module = {
        exports: {}
      };
      var exports = module.exports;
      return module;
    }
  `;
  const comments: any[] = [];
  const tokens: any[] = [];
  const wrapperAst = parse(wrapperSource, {
    sourceType: 'module',
    locations: true,
    ranges: true,
    onComment: comments,
    onToken: tokens
  }).body[0];
  attachComments(wrapperAst, comments, tokens);

  let wrapperBlock = getWrapperBlock(wrapperAst);
  wrapperBlock.body = [
    ...wrapperBlock.body.slice(0, wrapperBlock.body.length - 1),
    ...moduleAst.body,
    ...wrapperBlock.body.slice(wrapperBlock.body.length - 1)] as ESTree.Statement[];

  return {
    index,
    name,
    ast: wrapperAst
  };
}

const moduleBundleQueue: string[] = [];
export function enqueueModule(modulePath: string): void {
  if (moduleBundleQueue.indexOf(modulePath) === -1) {
    moduleBundleQueue.push(modulePath);
  }
}

export function bundleNextModule(modules: (ESTree.Expression | ESTree.SpreadElement)[],
    host: IHost, plugins: any = defaultPlugins): boolean {
  if (moduleBundleQueue.length === 0) {
    return false;
  }
  const modulePath = moduleBundleQueue.shift();
  wrapModule(modulePath, modules, host, plugins);
  return true;
}

function wrapModule(modulePath: string, modules: (ESTree.Expression | ESTree.SpreadElement)[],
    host: IHost, plugins: any): void {
  const moduleName = getModuleName(modulePath);

  // Prefill module indices
  getModuleIndex(moduleName);
  if (wrappedModules[moduleName].ast !== undefined) {
    // Module is already up to date
    return;
  }

  try {
    let moduleAst: ESTree.Program;
    if (!host.fileExists(modulePath)) {
      moduleAst = b.program([
        b.throwStatement(
          b.literal(`Module ${modulePath} not found`)
        )
      ]);
    } else {
      const comments: any[] = [];
      const tokens: any[] = [];
      moduleAst = parse(host.readFile(modulePath).toString(), {
        ecmaVersion: 7,
        sourceType: 'module',
        locations: true,
        ranges: true,
        allowHashBang: true,
        onComment: comments,
        onToken: tokens
      });
      attachComments(moduleAst, comments, tokens);
      Object.keys(plugins).forEach(plugin => {
        plugins[plugin](moduleAst, modulePath, host);
      });
    }

    const wrappedModule = createModuleWrapper(moduleName, moduleAst);
    wrappedModules[wrappedModule.name] = wrappedModule;
    modules[wrappedModule.index] = wrappedModule.ast;
  } catch (e) {
    console.error(`Failed to process module '${modulePath}'`);
    throw e;
  }
}

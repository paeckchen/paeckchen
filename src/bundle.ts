import { join } from 'path';
import { parse } from 'acorn';
import { generate } from 'escodegen';

import { IHost, DefaultHost } from './host';
import { getModulePath } from './module-path';
import { enqueueModule, bundleNextModule } from './modules';
import { IDetectedGlobals, injectGlobals } from './globals';
import { createConfig, IConfig } from './config';
import { Watcher } from './watcher';

export type SourceOptions =
    'es5'
  | 'es6' | 'es2015';

export interface IBundleOptions {
  configFile?: string;
  entryPoint?: string;
  source?: SourceOptions;
  outputDirectory?: string;
  outputFile?: string;
  runtime?: string;
  alias?: string|string[];
  external?: string|string[];
  watchMode?: boolean;
}

export interface IPaeckchenContext {
  config: IConfig;
  host: IHost;
  watcher?: Watcher;
  rebundle?: () => void;
}

function getModules(ast: ESTree.Program): ESTree.ArrayExpression {
  return (ast as any).body[2].declarations[0].init;
}

const paeckchenSource = `
  var __paeckchen_cache__ = [];
  function __paeckchen_require__(index) {
    if (!(index in __paeckchen_cache__)) {
      __paeckchen_cache__[index] = {
        module: {
          exports: {}
        }
      };
      modules[index](__paeckchen_cache__[index].module, __paeckchen_cache__[index].module.exports);
    }
    return __paeckchen_cache__[index].module;
  }
  var modules = [];
  __paeckchen_require__(0);
`;

export type BundlingFunction = typeof executeBundling;
export function executeBundling(paeckchenAst: ESTree.Program, modules: (ESTree.Expression | ESTree.SpreadElement)[],
    context: IPaeckchenContext, detectedGlobals: IDetectedGlobals, outputFunction: OutputFunction): string {
  while (bundleNextModule(modules, context, detectedGlobals)) {
    process.stderr.write('.');
  }
  injectGlobals(detectedGlobals, paeckchenAst, context);
  while (bundleNextModule(modules, context, detectedGlobals)) {
    process.stderr.write('.');
  }
  process.stderr.write('\n');

  const bundleResult = generate(paeckchenAst, {
    comment: true
  });
  outputFunction(bundleResult, context);
  return bundleResult;
}

export type RebundleFactory = typeof rebundleFactory;
export function rebundleFactory(paeckchenAst: ESTree.Program, modules: (ESTree.Expression | ESTree.SpreadElement)[],
    context: IPaeckchenContext, detectedGlobals: IDetectedGlobals, bundleFunction: BundlingFunction,
      outputFunction: OutputFunction): () => void {
  let timer: NodeJS.Timer;
  return () => {
    if (timer) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => {
      bundleFunction(paeckchenAst, modules, context, detectedGlobals, outputFunction);
    }, 0);
  };
}

export type OutputFunction = typeof writeOutput;
export function writeOutput(bundleResult: string, context: IPaeckchenContext): void {
  if (context.config.output.file) {
    context.host.writeFile(
      context.host.joinPath(context.config.output.folder, context.config.output.file),
        bundleResult);
  }
}

export function bundle(options: IBundleOptions, host: IHost = new DefaultHost(),
    outputFunction: OutputFunction = writeOutput,
      bundleFunction: BundlingFunction = executeBundling,
        rebundleFactoryFunction: RebundleFactory = rebundleFactory): string {
  const context: IPaeckchenContext = {
    config: createConfig(options, host),
    host
  };
  if (!context.config.input.entryPoint) {
    throw new Error('Missing entry-point');
  }
  if (context.config.watchMode) {
    context.watcher = new Watcher(host);
  }

  const detectedGlobals: IDetectedGlobals = {
    global: false,
    process: false,
    buffer: false
  };
  const paeckchenAst = parse(paeckchenSource);
  const modules = getModules(paeckchenAst).elements;
  const absoluteEntryPath = join(host.cwd(), context.config.input.entryPoint);
  enqueueModule(getModulePath('.', absoluteEntryPath, context));

  if (context.config.watchMode) {
    context.rebundle = rebundleFactoryFunction(paeckchenAst, modules, context, detectedGlobals, bundleFunction,
      outputFunction);
  }

  return bundleFunction(paeckchenAst, modules, context, detectedGlobals, outputFunction);
}

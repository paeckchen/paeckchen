import { join } from 'path';
import { parse } from 'acorn';
import { generate } from 'escodegen';
import { loadSync as sorceryLoadSync } from 'sorcery';

import { IHost, DefaultHost } from './host';
import { getModulePath } from './module-path';
import { enqueueModule, bundleNextModules } from './modules';
import { injectGlobals } from './globals';
import { createConfig, IConfig } from './config';
import { State } from './state';
import { Watcher } from './watcher';
import { ProgressStep, Logger, NoopLogger } from './logger';

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
  logger?: Logger;
  sourceMap?: boolean;
  logLevel?: 'default' | 'debug' | 'trace';
}

export interface IPaeckchenContext {
  config: IConfig;
  host: IHost;
  watcher?: Watcher;
  rebundle?: () => void;
  logger: Logger;
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

export type BundleChunkFunction = typeof bundleChunks;
/**
 * Recursivly bundle chunks of modules wich are enqueued.
 */
export function bundleChunks(step: ProgressStep, state: State, context: IPaeckchenContext): Promise<void> {
  const fns = bundleNextModules(state, context);
  if (fns.length > 0) {
    let num = fns.length - 1;
    return Promise.all(fns.map(fn => {
        return fn.then(() => {
          num--;
          context.logger.progress(step, state.moduleBundleQueue.length + num, state.modules.length);
        });
      }))
      .then(() => bundleChunks(step, state, context));
  }
  return Promise.resolve();
};

export type BundlingFunction = typeof executeBundling;
/**
 * Bundle a complete paeckchen in the following steps:
 *
 * * init bundling
 * * process modules
 * * inject global code
 * * process global dependencies
 * * create source-map
 * * output result
 */
export function executeBundling(state: State, paeckchenAst: ESTree.Program, context: IPaeckchenContext,
    outputFunction: OutputFunction, bundleChunkFunction: BundleChunkFunction = bundleChunks): void {
  context.logger.progress(ProgressStep.init, state.moduleBundleQueue.length, state.modules.length);

  bundleChunks(ProgressStep.bundleModules, state, context)
    .then(() => injectGlobals(state, paeckchenAst, context))
    .then(() => bundleChunks(ProgressStep.bundleGlobals, state, context))
    .then(() => {
        context.logger.progress(ProgressStep.generateBundle, state.moduleBundleQueue.length, state.modules.length);
        const bundleResult = generate(paeckchenAst, {
          comment: true,
          sourceMap: context.config.output.sourceMap,
          sourceMapWithCode: context.config.output.sourceMap
        });

        context.logger.progress(ProgressStep.end, state.moduleBundleQueue.length, state.modules.length);
        if (typeof bundleResult === 'string') {
          outputFunction(bundleResult, undefined, context);
        } else {
          const chain = sorceryLoadSync('paeckchen.js', {
            content: {
              'paeckchen.js': bundleResult.code
            },
            sourcemaps: {
              'paeckchen.js': JSON.parse(bundleResult.map.toString())
            }
          });
          outputFunction(bundleResult.code, chain.apply().toString(), context);
        }
      })
    .catch(error => {
      context.logger.error('bundling', error, 'Failed to bundle');
    });
}

export type RebundleFactory = typeof rebundleFactory;
export function rebundleFactory(state: State, paeckchenAst: ESTree.Program, context: IPaeckchenContext,
    bundleFunction: BundlingFunction, outputFunction: OutputFunction): () => void {
  let timer: NodeJS.Timer;
  return () => {
    if (timer) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => {
      bundleFunction(state, paeckchenAst, context, outputFunction);
    }, 0);
  };
}

export interface OutputFunction {
  (code: string, sourceMap: string|undefined, context: IPaeckchenContext): void;
}

function createContext(config: IConfig, host: IHost, options: IBundleOptions): IPaeckchenContext {
  const context: IPaeckchenContext = {
    config,
    host,
    logger: options.logger || new NoopLogger()
  };
  context.logger.configure(config);
  if (!context.config.input.entryPoint) {
    throw new Error('Missing entry-point');
  }
  if (context.config.watchMode) {
    context.watcher = new Watcher();
  }
  return context;
}

export function bundle(options: IBundleOptions, host: IHost = new DefaultHost(), outputFunction: OutputFunction,
    bundleFunction: BundlingFunction = executeBundling,
      rebundleFactoryFunction: RebundleFactory = rebundleFactory): Promise<void> {
  return createConfig(options, host)
    .then(config => {
      const context = createContext(config, host, options);

      const paeckchenAst = parse(paeckchenSource);
      const state = new State(getModules(paeckchenAst).elements);
      const absoluteEntryPath = join(host.cwd(), context.config.input.entryPoint);

      return getModulePath('.', absoluteEntryPath, context)
        .then(modulePath => {
          enqueueModule(modulePath, state, context);
          if (context.config.watchMode) {
            context.rebundle = rebundleFactoryFunction(state, paeckchenAst, context, bundleFunction, outputFunction);
          }
          bundleFunction(state, paeckchenAst, context, outputFunction);
        });
    });
}

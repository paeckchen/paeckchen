import { cpus } from 'os';
import { join } from 'path';
import { parse } from 'acorn';
import { generate } from 'escodegen';
import * as Threads from 'webworker-threads';

import { IHost, DefaultHost } from './host';
import { getModulePath } from './module-path';
import { enqueueModule, bundleNextModule } from './modules';
import { IDetectedGlobals, injectGlobals } from './globals';
import { createConfig, IConfig } from './config';

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
}

const pool = Threads.createPool(cpus().length);
pool.load(require.resolve('./worker'), (...args: any[]) => {
  // console.log('pool loaded', ...args);
});


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

export function bundle(options: IBundleOptions, host: IHost = new DefaultHost()): string {
  const context: IPaeckchenContext = {
    config: createConfig(options, host),
    host
  };
  if (!context.config.input.entryPoint) {
    throw new Error('Missing entry-point');
  }

  const detectedGlobals: IDetectedGlobals = {
    global: false,
    process: false,
    buffer: false
  };
  const paeckchenAst = parse(paeckchenSource);
  const modules = getModules(paeckchenAst).elements;
  const absoluteEntryPath = join(host.cwd(), context.config.input.entryPoint);

  pool.any.emit('processFile', absoluteEntryPath);
  pool.on('enqueueModule', enqueueModule);
  pool.on('processedFile', (...args: any[]) => {
    console.log('processedFile', ...args);
  });
  pool.on('error', (errorJson) => {
    const errorData = JSON.parse(errorJson);
    const error = new Error(errorData.message);
    error.stack = errorData.stack;
    console.error(error);
    process.exit(1);
  });


  // start bundling...
  // enqueueModule(getModulePath('.', absoluteEntryPath, context));
  // while (bundleNextModule(modules, context, detectedGlobals)) {
  //   process.stderr.write('.');
  // }
  // // ... when ready inject globals...
  // injectGlobals(detectedGlobals, paeckchenAst, context);
  // // ... and bundle global dependencies
  // while (bundleNextModule(modules, context, detectedGlobals)) {
  //   process.stderr.write('.');
  // }
  // process.stderr.write('\n');

  const bundleResult = generate(paeckchenAst, {
    comment: true
  });
  if (context.config.output.file) {
    host.writeFile(
      host.joinPath(context.config.output.folder, context.config.output.file),
        bundleResult);
    return undefined;
  }
  return bundleResult;
}

import { cpus } from 'os';
import { join } from 'path';
import { parse } from 'acorn';
import { generate } from 'escodegen';

import { IHost, DefaultHost } from './host';
import { getModulePath } from './module-path';
import { enqueueModule, wrapModuleAst, bundleNextModule } from './modules';
import createPool from './pool';
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

const pool = createPool(cpus().length, require.resolve('./worker'));

export function bundle(options: IBundleOptions, host: IHost = new DefaultHost(), callback: Function): void {
  const context: IPaeckchenContext = {
    config: createConfig(options, host),
    host
  };
  if (!context.config.input.entryPoint) {
    throw new Error('Missing entry-point');
  }

  let detectedGlobals: IDetectedGlobals = {
    global: false,
    process: false,
    buffer: false
  };
  const paeckchenAst = parse(paeckchenSource);
  const modules = getModules(paeckchenAst).elements;
  const absoluteEntryPath = join(host.cwd(), context.config.input.entryPoint);

  const processed = [];

  pool.all('configure', options);
  pool.on('enqueueModule', (path) => {
    enqueueModule(getModulePath(absoluteEntryPath, path, context));
    const toProcess = queue.shift();
    if (processed.indexOf(toProcess) === -1 && toProcess != null) {
      processed.push(toProcess);
      pool.any('processFile', toProcess);
    }
  });
  
  pool.on('processedFile', ({ ast, globals, path }) => {
    process.stderr.write('.');

    detectedGlobals = Object.assign({}, detectedGlobals, globals);
    wrapModuleAst(path, ast, modules, context);

    if (pool.isIdle() && queue.length === 0) {
      pool.destroy();

      injectGlobals(detectedGlobals, paeckchenAst, context);

      while (bundleNextModule(modules, context, detectedGlobals)) {
        process.stderr.write('.');
      }
      process.stderr.write('\n');

      const bundleResult = generate(paeckchenAst, { comment: true });
      if (context.config.output.file) {
        host.writeFile(
          host.joinPath(context.config.output.folder, context.config.output.file),
          bundleResult
        );
      }
      callback(null, bundleResult);
    }
  });
  
  const queue = enqueueModule(getModulePath('.', absoluteEntryPath, context));
  // Start processing in the worker pool
  pool.any('processFile', queue.shift());
}

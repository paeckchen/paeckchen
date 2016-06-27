import { join } from 'path';
import { parse } from 'acorn';
import { generate } from 'escodegen';

import { IHost, DefaultHost } from './host';
import { getModulePath } from './module-path';
import { enqueueModule, bundleNextModule } from './modules';
import { IDetectedGlobals, injectGlobals } from './globals';

export function bundle(entryPoint: string, host: IHost = new DefaultHost()): string {
  function getModules(ast: ESTree.Program): ESTree.ArrayExpression {
    return (ast as any).body[2].declarations[0].init;
  }

  const detectedGlobals: IDetectedGlobals = {
    global: false,
    process: false,
    buffer: false
  };

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
  const paeckchenAst = parse(paeckchenSource);
  const modules = getModules(paeckchenAst).elements;
  const absoluteEntryPath = join(process.cwd(), entryPoint);
  // start bundling...
  enqueueModule(getModulePath('.', absoluteEntryPath, host));
  while (bundleNextModule(modules, host, detectedGlobals)) {
    process.stderr.write('.');
  }
  // ... when ready inject globals...
  injectGlobals(detectedGlobals, paeckchenAst, host);
  // ... and bundle global dependencies
  while (bundleNextModule(modules, host, detectedGlobals)) {
    process.stderr.write('.');
  }
  process.stderr.write('\n');

  return generate(paeckchenAst, {
    comment: true
  });
}

import { join } from 'path';
import * as minimistNode from 'minimist';
const minimist: typeof minimistNode = minimistNode;
import { parse } from 'acorn';
import { generate } from 'escodegen';

import { DefaultHost } from './host';
import { getModulePath } from './module-path';
import { enqueueModule, bundleNextModule } from './modules';

function bundle(argv: minimistNode.ParsedArgs): string {
  function getModules(ast: ESTree.Program): ESTree.ArrayExpression {
    return (ast as any).body[2].declarations[0].init;
  }

  if (!argv['entry']) {
    throw new Error('Missing --entry argument');
  }

  const host = new DefaultHost();

  const paeckchenSource = `
    var __paeckchen_cache__ = [];
    function __paeckchen_require__(index) {
      if (!__paeckchen_cache__[index]) {
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
  const absoluteEntryPath = join(process.cwd(), argv['entry']);
  enqueueModule(getModulePath('.', absoluteEntryPath, host));
  while (bundleNextModule(modules, host)) {
    process.stderr.write('.');
  }
  process.stderr.write('\n');
  return generate(paeckchenAst, {
    comment: true
  });
}

// TODO: create config file
// TODO: add watch mode
const argv = minimist(process.argv.slice(2), {
  string: ['config', 'entry'],
  boolean: ['watch'],
  default: {
    config: join(__dirname, 'paeckchen.config.js'),
    watch: false
  }
});

const startTime = new Date().getTime();
process.stdout.write(bundle(argv));
const endTime = new Date().getTime();
process.stderr.write(`Bundeling took ${(endTime - startTime) / 1000}s`);

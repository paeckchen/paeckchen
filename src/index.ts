import { join } from 'path';
import * as minimistNode from 'minimist';
const minimist: typeof minimistNode = minimistNode;
import { parse } from 'acorn';
import * as astringNode from 'astring';
const astring: typeof astringNode = astringNode as any;

import { DefaultHost } from './host';
import { getModulePath } from './module-path';
import { enqueueModule, bundleNextModule } from './modules';

function getModules(ast: ESTree.Program): ESTree.ArrayExpression {
  return (ast.body[0] as ESTree.VariableDeclaration).declarations[0].init as ESTree.ArrayExpression;
}

function bundle(argv: minimistNode.ParsedArgs): string {
  if (!argv['entry']) {
    throw new Error('Missing --entry argument');
  }

  const host = new DefaultHost();

  const paeckchenSource = `
    var modules = [];
    modules[0]();
  `;
  const paeckchenAst = parse(paeckchenSource);
  const modules = getModules(paeckchenAst).elements;
  const absoluteEntryPath = join(process.cwd(), argv['entry']);
  enqueueModule(getModulePath('.', absoluteEntryPath, host));
  while (bundleNextModule(modules, host)) {
    process.stderr.write('.');
  }
  process.stderr.write('\n');
  return astring(paeckchenAst, {comments: true});
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

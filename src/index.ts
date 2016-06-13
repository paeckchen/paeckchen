import * as path from 'path';
import * as minimistNode from 'minimist';
const minimist: typeof minimistNode = minimistNode;
import { parse } from 'acorn';
import * as astringNode from 'astring';
const astring: typeof astringNode = astringNode as any;

import { wrapModule } from './modules';

function getModules(ast: ESTree.Program): ESTree.ArrayExpression {
  return (ast.body[0] as ESTree.VariableDeclaration).declarations[0].init as ESTree.ArrayExpression;
}

function bundle(argv: minimistNode.ParsedArgs): string {
  if (!argv['entry']) {
    throw new Error('Missing --entry argument');
  }

  const paeckchenSource = `
    var modules = [];
    modules[0]();
  `;
  const paeckchenAst = parse(paeckchenSource);
  const modules = getModules(paeckchenAst).elements;
  wrapModule(argv['entry'], modules);
  return astring(paeckchenAst, {comments: true});
}

// TODO: create config file
// TODO: add watch mode
const argv = minimist(process.argv.slice(2), {
  string: ['config', 'entry'],
  boolean: ['watch'],
  default: {
    config: path.join(__dirname, 'paeckchen.config.js'),
    watch: false
  }
});

const startTime = new Date().getTime();
console.log(bundle(argv));
const endTime = new Date().getTime();
console.log(`Bundeling took ${(endTime - startTime) / 1000}s`);

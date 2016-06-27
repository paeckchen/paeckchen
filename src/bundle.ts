import { join } from 'path';
import { parse } from 'acorn';
import { generate } from 'escodegen';

import { IHost, DefaultHost } from './host';
import { getModulePath } from './module-path';
import { enqueueModule, bundleNextModule } from './modules';
import { IDetectedGlobals, injectGlobals } from './globals';

function getModules(ast: ESTree.Program): ESTree.ArrayExpression {
  return (ast.body[0] as ESTree.VariableDeclaration).declarations[0].init as ESTree.ArrayExpression;
}

export function bundle(entryPoint: string, host: IHost = new DefaultHost()): string {
  const detectedGlobals: IDetectedGlobals = {
    process: false
  };

  const paeckchenSource = `
    var modules = [];
    modules[0]();
  `;
  const paeckchenAst = parse(paeckchenSource);
  const modules = getModules(paeckchenAst).elements;
  const absoluteEntryPath = join(process.cwd(), entryPoint);
  enqueueModule(getModulePath('.', absoluteEntryPath, host));
  while (bundleNextModule(modules, host, detectedGlobals)) {
    process.stderr.write('.');
  }
  process.stderr.write('\n');
  injectGlobals(detectedGlobals, paeckchenAst);

  return generate(paeckchenAst, {
    comment: true
  });
}

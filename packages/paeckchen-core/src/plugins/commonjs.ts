import { visit, builders as b, namedTypes as n, Path, Visitor } from 'ast-types';
import * as ESTree from 'estree';

import { PaeckchenContext } from '../bundle';
import { getModulePath } from '../module-path';
import { getModuleIndex, enqueueModule } from '../modules';
import { State } from '../state';

export async function rewriteRequireStatements(program: ESTree.Program, currentModule: string,
    context: PaeckchenContext, state: State): Promise<void> {
  context.logger.trace('plugin', `rewriteRequireStatements [currentModule=${currentModule}]`);

  const requireUpdates: [string, Path<ESTree.CallExpression>][] = [];

  visit(program, {
    visitCallExpression(this: Visitor, path: Path<ESTree.CallExpression>): boolean|void {
      const callee = path.node.callee;
      // tslint:disable-next-line
      // TODO: check binding here, not name
      if (n.Identifier.check(callee) && callee.name === 'require') {
        const importPath = path.node.arguments[0];
        if (n.Literal.check(importPath) && (importPath as ESTree.Literal).value) {
          const value = (importPath as ESTree.Literal).value;
          if (value) {
            requireUpdates.push([value.toString(), path]);
          }
        }
        return false;
      }
      this.traverse(path);
    }
  });

  await Promise.all(requireUpdates.map(async update => {
    const [requirePath, path] = update;
    const modulePath = await getModulePath(currentModule, requirePath, context);
    const moduleIndex = getModuleIndex(modulePath, state);
    replaceRequireCall(path, moduleIndex);
    enqueueModule(modulePath, state, context);
  }));
}

function replaceRequireCall(path: Path<ESTree.CallExpression>, moduleIndex: number): void {
  path.replace(
    b.memberExpression(
      b.callExpression(
        b.identifier('__paeckchen_require__'),
        [
          b.literal(moduleIndex)
        ]
      ),
      b.identifier('exports'),
      false
    )
  );
}

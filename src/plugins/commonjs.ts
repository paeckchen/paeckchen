import { visit, builders as b, namedTypes as n, IPath } from 'ast-types';

import { getModuleIndex, enqueueModule } from '../modules';
import { getModulePath } from '../module-path';
import { IPaeckchenContext } from '../bundle';

export function rewriteRequireStatements(program: ESTree.Program, currentModule: string,
    context: IPaeckchenContext): void {
  visit(program, {
    visitCallExpression(path: IPath<ESTree.CallExpression>): boolean {
      const callee = path.node.callee;
      // TODO: check binding here, not name
      if (n.Identifier.check(callee) && callee.name === 'require') {
        const importPath = path.node.arguments[0];
        if (n.Literal.check(importPath)) {
          const modulePath = getModulePath(currentModule, (importPath as ESTree.Literal).value.toString(), context);
          const moduleIndex = getModuleIndex(modulePath);

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

          enqueueModule(modulePath);
        }
        return false;
      }
      this.traverse(path);
    }
  });
}

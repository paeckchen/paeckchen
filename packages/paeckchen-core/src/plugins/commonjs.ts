import { visit, builders as b, namedTypes as n, IPath, IVisitor } from 'ast-types';

import { getModuleIndex, enqueueModule } from '../modules';
import { getModulePath } from '../module-path';
import { IPaeckchenContext } from '../bundle';
import { State } from '../state';

export function rewriteRequireStatements(program: ESTree.Program, currentModule: string,
    context: IPaeckchenContext, state: State): void {
  visit(program, {
    visitCallExpression(this: IVisitor, path: IPath<ESTree.CallExpression>): boolean|void {
      const callee = path.node.callee;
      // TODO: check binding here, not name
      if (n.Identifier.check(callee) && callee.name === 'require') {
        const importPath = path.node.arguments[0];
        if (n.Literal.check(importPath) && (importPath as ESTree.Literal).value) {
          const value = (importPath as ESTree.Literal).value;
          if (value) {
            const modulePath = getModulePath(currentModule, value.toString(), context);
            const moduleIndex = getModuleIndex(modulePath, state);

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
        }
        return false;
      }
      this.traverse(path);
    }
  });
}

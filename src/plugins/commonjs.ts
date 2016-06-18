import { visit, builders as b, namedTypes as n, IPath } from 'ast-types';

import { getModuleIndex, wrapModule } from '../modules';
import { getModulePath } from '../module-path';
import { IHost } from '../host';

export function rewriteRequireStatements(program: ESTree.Program, moduleName: string,
    modules: (ESTree.Expression | ESTree.SpreadElement)[], host: IHost): void {
  visit(program, {
    visitCallExpression(path: IPath<ESTree.CallExpression>): boolean {
      const callee = path.node.callee;
      // TODO: check binding here, not name
      if (n.Identifier.check(callee) && callee.name === 'require') {
        const importPath = path.node.arguments[0];
        if (n.Literal.check(importPath)) {
          const modulePath = getModulePath(moduleName, (importPath as ESTree.Literal).value.toString(), host);
          const moduleIndex = getModuleIndex(modulePath);

          path.replace(
            b.memberExpression(
              b.callExpression(
                b.memberExpression(
                  b.identifier('modules'),
                  b.identifier(moduleIndex.toString()),
                  true
                ),
                []
              ),
              b.identifier('exports'),
              false
            )
          );

          wrapModule(modulePath, modules, host);
        }
      }
      return false;
    }
  });
}

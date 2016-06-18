import { visit, builders as b, namedTypes as n, IPath } from 'ast-types';

import { getModuleIndex, wrapModule } from '../modules';
import { getModulePath } from '../module-path';
import { IHost } from '../host';

export function rewriteImportDeclaration(program: ESTree.Program, moduleName: string,
    modules: (ESTree.Expression | ESTree.SpreadElement)[], host: IHost): void {
  visit(program, {
    visitImportDeclaration: function(path: IPath<ESTree.ImportDeclaration>): boolean {
      const source = path.node.source;
      if (n.Literal.check(source)) {
        // e.g. import { a as b, c } from './dep';
        const importModule = getModulePath(moduleName, source.value as string, host);
        const importModuleIndex = getModuleIndex(importModule);

        const loc = (pos: ESTree.Position) => `${pos.line}_${pos.column}`;
        const tempIdentifier = b.identifier(`__import${importModuleIndex}_${loc(path.node.loc.start)}`);
        const imports = path.node.specifiers.map((specifier) => {
          if (n.ImportSpecifier.check(specifier)) {
            return b.variableDeclarator(
              b.identifier(specifier.local.name),
              b.memberExpression(
                b.memberExpression(
                  tempIdentifier,
                  b.identifier('exports'),
                  false
                ),
                b.literal(specifier.imported.name),
                true
              )
            );
          } else if (n.ImportDefaultSpecifier.check(specifier)) {
            return b.variableDeclarator(
              b.identifier(specifier.local.name),
              b.memberExpression(
                b.memberExpression(
                  tempIdentifier,
                  b.identifier('exports'),
                  false
                ),
                b.literal('default'),
                true
              )
            );
          } else if (n.ImportNamespaceSpecifier.check(specifier)) {
            return b.variableDeclarator(
              b.identifier(specifier.local.name),
              b.memberExpression(
                tempIdentifier,
                b.identifier('exports'),
                false
              )
            );
          }
        });
        path.replace(
          b.variableDeclaration(
            'var',
            [
              b.variableDeclarator(
                tempIdentifier,
                b.callExpression(
                  b.memberExpression(
                    b.identifier('modules'),
                    b.identifier(importModuleIndex.toString()),
                    true
                  ),
                  []
                )
              ),
              ...imports
            ]
          )
        );

        wrapModule(importModule, modules, host);
      }
      return false;
    }
  });
}

import { visit, builders as b, namedTypes as n, IPath } from 'ast-types';

import { getModuleIndex, enqueueModule } from '../modules';
import { getModulePath } from '../module-path';
import { IPaeckchenContext } from '../bundle';

export function rewriteImportDeclaration(program: ESTree.Program, currentModule: string,
    context: IPaeckchenContext): void {
  visit(program, {
    visitImportDeclaration: function(path: IPath<ESTree.ImportDeclaration>): boolean {
      const source = path.node.source;

      if (n.Literal.check(source)) {
        const importModule = getModulePath(currentModule, source.value as string, context);
        const importModuleIndex = getModuleIndex(importModule);

        const loc = (pos: ESTree.Position) => `${pos.line}_${pos.column}`;
        const tempIdentifier = b.identifier(`__import${importModuleIndex}_${loc(path.node.loc.start)}`);
        const imports = path.node.specifiers.map((specifier) => {
          if (n.ImportSpecifier.check(specifier)) {
            // e.g. import { a as b, c } from './dep';
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
            // e.g. import dep from './dep';
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
            // e.g. import * as dep from './dep';
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
                  b.identifier('__paeckchen_require__'),
                  [
                    b.literal(importModuleIndex)
                  ]
                )
              ),
              ...imports
            ]
          )
        );

        enqueueModule(importModule);
      }
      return false;
    }
  });
}

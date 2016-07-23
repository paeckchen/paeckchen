import { visit, builders as b, namedTypes as n, IPath } from 'ast-types';

import { getModuleIndex, enqueueModule } from '../modules';
import { getModulePath } from '../module-path';
import { IPaeckchenContext } from '../bundle';
import { State } from '../state';

export function rewriteImportDeclaration(program: ESTree.Program, currentModule: string,
    context: IPaeckchenContext, state: State): void {
  visit(program, {
    visitImportDeclaration: function(path: IPath<ESTree.ImportDeclaration>): boolean {
      const source = path.node.source;

      if (n.Literal.check(source)) {
        const importModule = getModulePath(currentModule, source.value as string, context);
        const importModuleIndex = getModuleIndex(importModule, state);

        const tempIdentifier = path.scope.declareTemporary(`__import${importModuleIndex}`);
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
          }
          // e.g. import * as dep from './dep';
          return b.variableDeclarator(
            b.identifier((specifier as ESTree.ImportNamespaceSpecifier).local.name),
            b.memberExpression(
              tempIdentifier,
              b.identifier('exports'),
              false
            )
          );
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

        enqueueModule(importModule, state);
      }
      return false;
    },
    visitStatement: function(): boolean {
      // es2015 imports are only allowed at the top level of a module
      // => we could stop here
      return false;
    }
  });
}

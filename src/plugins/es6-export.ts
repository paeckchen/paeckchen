import { visit, builders as b, namedTypes as n, IPath } from 'ast-types';

import { getModuleIndex, wrapModule } from '../modules';
import { getModulePath } from '../module-path';

function moduleExportsExpression(id: string): any {
  return b.memberExpression(
    b.memberExpression(
      b.identifier('module'),
      b.identifier('exports'),
      false
    ),
    b.literal(id),
    true
  );
}

/**
 * var identifier = modules[moduleIndex]();
 */
function importModule(identifier: ESTree.Identifier, moduleIndex: number): ESTree.VariableDeclaration {
  return b.variableDeclaration(
    'var',
    [
      b.variableDeclarator(
        identifier,
        b.callExpression(
          b.memberExpression(
            b.identifier('modules'),
            b.identifier(moduleIndex.toString()),
            true
          ),
          []
        )
      )
    ]
  );
}

/**
 * Object.keys(identifier).forEach(function(key) {
 *   module.exports[key] = identifier.exports[key];
 * });
 */
function exportAllKeys(identifier: ESTree.Identifier): ESTree.ExpressionStatement {
  return b.expressionStatement(
    b.callExpression(
      b.memberExpression(
        b.callExpression(
          b.memberExpression(
            b.identifier('Object'),
            b.identifier('keys'),
            false
          ),
          [
            identifier
          ]
        ),
        b.identifier('forEach'),
        false
      ),
      [
        b.functionExpression(
          null,
          [
            b.identifier('key')
          ],
          b.blockStatement([
            b.expressionStatement(
              b.assignmentExpression(
                '=',
                b.memberExpression(
                  b.memberExpression(
                    b.identifier('module'),
                    b.identifier('exports'),
                    false
                  ),
                  b.identifier('key'),
                  true
                ),
                b.memberExpression(
                  b.memberExpression(
                    identifier,
                    b.identifier('exports'),
                    false
                  ),
                  b.identifier('key'),
                  true
                )
              )
            )
          ])
        )
      ]
    )
  );
}

export function rewriteExportNamedDeclaration(program: ESTree.Program, moduleName: string,
  modules: (ESTree.Expression | ESTree.SpreadElement)[]): void {
  visit(program, {
    visitExportAllDeclaration: function(path: IPath<ESTree.ExportAllDeclaration>): boolean {
      // e.g. export * from './a';
      const reexportModuleName = getModulePath(moduleName, path.node.source.value as string);
      const reexportModuleIndex = getModuleIndex(reexportModuleName);

      const loc = (pos: ESTree.Position) => `${pos.line}_${pos.column}`;
      const tempIdentifier = b.identifier(`__export${reexportModuleIndex}_${loc(path.node.loc.start)}`);

      path.replace(
        importModule(tempIdentifier, reexportModuleIndex),
        exportAllKeys(tempIdentifier)
      );

      wrapModule(reexportModuleName, modules);
      return false;
    },
    visitExportNamedDeclaration: function (path: IPath<ESTree.ExportNamedDeclaration>): boolean {
      if (path.node.declaration) {
        const declaration = path.node.declaration;
        if (n.VariableDeclaration.check(declaration)) {
          // e.g. export var a = 0;
          const id = declaration.declarations[0].id;
          path.replace(declaration);
          path.insertAfter(
            b.expressionStatement(
              b.assignmentExpression(
                '=',
                moduleExportsExpression((id as ESTree.Identifier).name),
                b.identifier((id as ESTree.Identifier).name)
              )
            )
          );
        } else if (n.FunctionDeclaration.check(declaration) || n.ClassDeclaration.check(declaration)) {
          // e.g. export function f() {}
          path.replace(declaration);
          path.insertAfter(
            b.expressionStatement(
              b.assignmentExpression(
                '=',
                moduleExportsExpression(declaration.id.name),
                b.identifier(declaration.id.name)
              )
            )
          );
        }
      } else {
        if (path.node.source) {
          // e.g. export {a as b} from './c';
          const reexportModuleName = getModulePath(moduleName, path.node.source.value as string);
          const reexportModuleIndex = getModuleIndex(reexportModuleName);

          const loc = (pos: ESTree.Position) => `${pos.line}_${pos.column}`;
          const tempIdentifier = b.identifier(`__export${reexportModuleIndex}_${loc(path.node.loc.start)}`);
          const exports = path.node.specifiers
            .map(specifier =>
              b.expressionStatement(
                b.assignmentExpression(
                  '=',
                  moduleExportsExpression(specifier.exported.name),
                  b.memberExpression(
                    b.memberExpression(
                      tempIdentifier,
                      b.identifier('exports'),
                      false
                    ),
                    b.literal(specifier.local.name),
                    true
                  )
                )
              )
            );

          path.replace(
            b.variableDeclaration(
              'var',
              [
                b.variableDeclarator(
                  tempIdentifier,
                  b.callExpression(
                    b.memberExpression(
                      b.identifier('modules'),
                      b.identifier(reexportModuleIndex.toString()),
                      true
                    ),
                    []
                  )
                )
              ]
            ),
            ...exports
          );

          wrapModule(reexportModuleName, modules);
        } else {
          // e.g. export {a as b};
          const exports = path.node.specifiers
            .map(specifier =>
              b.expressionStatement(
                b.assignmentExpression(
                  '=',
                  moduleExportsExpression(specifier.exported.name),
                  b.literal(specifier.local.name)
                )
              )
            );
          path.replace(...exports);
        }
      }
      return false;
    },
    visitExportDefaultDeclaration: function(path: IPath<ESTree.ExportDefaultDeclaration>): boolean {
      const declaration = path.node.declaration;
      if (n.Identifier.check(declaration)) {
        // e.g. export default a;
        path.replace(
          b.expressionStatement(
            b.assignmentExpression(
              '=',
              moduleExportsExpression('default'),
              b.identifier(declaration.name)
            )
          )
        );
      } else if (n.FunctionDeclaration.check(declaration) || n.ClassDeclaration.check(declaration)) {
        // e.g. export default class {}
        path.replace(declaration);
        path.insertAfter(
          b.expressionStatement(
            b.assignmentExpression(
              '=',
              moduleExportsExpression('default'),
              b.literal(declaration.id.name)
            )
          )
        );
      }
      return false;
    }
  });
}

import { visit, builders as b, namedTypes as n, IPath } from 'ast-types';

import { getModuleIndex, enqueueModule } from '../modules';
import { getModulePath } from '../module-path';
import { IPaeckchenContext } from '../bundle';
import { State } from '../state';

export function rewriteExportNamedDeclaration(program: ESTree.Program, currentModule: string,
    context: IPaeckchenContext, state: State): Promise<void> {
  return Promise.resolve()
    .then(() => {
      context.logger.trace('plugin', `rewriteExportNamedDeclaration [currentModule=${currentModule}]`);
    })
    .then(() => {
      const exportAllUpdates: [string, IPath<ESTree.ExportAllDeclaration>][] = [];
      const exportNamedUpdates: [string, IPath<ESTree.ExportNamedDeclaration>][] = [];

      visit(program, {
        visitExportAllDeclaration: function(path: IPath<ESTree.ExportAllDeclaration>): boolean {
          // e.g. export * from './a';
          exportAllUpdates.push([path.node.source.value as string, path]);
          return false;
        },
        visitExportNamedDeclaration: function (path: IPath<ESTree.ExportNamedDeclaration>): boolean {
          if (path.node.declaration) {
            replaceExportNamedDeclaration(path);
          } else {
            if (path.node.source) {
              // e.g. export {a as b} from './c';
              exportNamedUpdates.push([path.node.source.value as string, path]);
            } else {
              // e.g. export {a as b};
              replaceExportRename(path);
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
                  b.identifier(declaration.id.name)
                )
              )
            );
          } else if (n.FunctionExpression.check(declaration)) {
            // e.g. export default function() {}
            path.replace(
              b.expressionStatement(
                b.assignmentExpression(
                  '=',
                  moduleExportsExpression('default'),
                  declaration
                )
              )
            );
          }
          return false;
        },
        visitStatement: function(): boolean {
          // es2015 exports are only allowed at the top level of a module
          // => we could stop here
          return false;
        }
      });

      const work: Promise<void>[] = [];
      work.push.apply(work, exportAllUpdates.map(update => {
        const [exportPath, path] = update;
        return getModulePath(currentModule, exportPath, context)
          .then(reexportModuleName => {
            const reexportModuleIndex = getModuleIndex(reexportModuleName, state);
            replaceExportAll(path, reexportModuleIndex);
            enqueueModule(reexportModuleName, state, context);
          });
      }));

      work.push.apply(work, exportNamedUpdates.map(update => {
        const [exportPath, path] = update;
        return getModulePath(currentModule, exportPath, context)
          .then(reexportModuleName => {
            const reexportModuleIndex = getModuleIndex(reexportModuleName, state);
            replaceReexportRename(path, reexportModuleIndex);
            enqueueModule(reexportModuleName, state, context);
          });
      }));

      return Promise.all(work);
    });
}

function replaceExportAll(path: IPath<ESTree.ExportAllDeclaration>, reexportModuleIndex: number): void {
  const tempIdentifier = path.scope.declareTemporary(`__export${reexportModuleIndex}`);

  path.replace(
    importModule(tempIdentifier, reexportModuleIndex),
    exportAllKeys(tempIdentifier)
  );
}

function replaceExportNamedDeclaration(path: IPath<ESTree.ExportNamedDeclaration>): void {
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
}

function replaceReexportRename(path: IPath<ESTree.ExportNamedDeclaration>, reexportModuleIndex: number): void {
  const tempIdentifier = path.scope.declareTemporary(`__export${reexportModuleIndex}`);
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
            b.identifier('__paeckchen_require__'),
            [
              b.literal(reexportModuleIndex)
            ]
          )
        )
      ]
    ),
    ...exports
  );
}

function replaceExportRename(path: IPath<ESTree.ExportNamedDeclaration>): void {
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
          b.identifier('__paeckchen_require__'),
          [
            b.literal(moduleIndex)
          ]
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
            b.memberExpression(
              identifier,
              b.identifier('exports'),
              false
            )
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

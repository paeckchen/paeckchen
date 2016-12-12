import { visit, builders as b, namedTypes as n, Path } from 'ast-types';
import * as ESTree from 'estree';

import { PaeckchenContext } from '../bundle';
import { getModulePath } from '../module-path';
import { getModuleIndex, enqueueModule } from '../modules';
import { State } from '../state';

export async function rewriteExportNamedDeclaration(program: ESTree.Program, currentModule: string,
    context: PaeckchenContext, state: State): Promise<void> {
  context.logger.trace('plugin', `rewriteExportNamedDeclaration [currentModule=${currentModule}]`);

  const exportAllUpdates: [string, Path<ESTree.ExportAllDeclaration>][] = [];
  const exportNamedUpdates: [string, Path<ESTree.ExportNamedDeclaration>][] = [];

  visit(program, {
    visitExportAllDeclaration(path: Path<ESTree.ExportAllDeclaration>): boolean {
      // e.g. export * from './a';
      exportAllUpdates.push([path.node.source.value as string, path]);
      return false;
    },
    visitExportNamedDeclaration (path: Path<ESTree.ExportNamedDeclaration>): boolean {
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
    visitExportDefaultDeclaration(path: Path<ESTree.ExportDefaultDeclaration>): boolean {
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
    visitStatement(): boolean {
      // es2015 exports are only allowed at the top level of a module
      // => we could stop here
      return false;
    }
  });

  const work: Promise<void>[] = [];
  work.push.apply(work, exportAllUpdates.map(async update => {
    const [exportPath, path] = update;
    const reexportModuleName = await getModulePath(currentModule, exportPath, context);
    const reexportModuleIndex = getModuleIndex(reexportModuleName, state);
    replaceExportAll(path, reexportModuleIndex);
    enqueueModule(reexportModuleName, state, context);
  }));

  work.push.apply(work, exportNamedUpdates.map(async update => {
    const [exportPath, path] = update;
    const reexportModuleName = await getModulePath(currentModule, exportPath, context);
    const reexportModuleIndex = getModuleIndex(reexportModuleName, state);
    replaceReexportRename(path, reexportModuleIndex);
    enqueueModule(reexportModuleName, state, context);
  }));

  await Promise.all(work);
}

function replaceExportAll(path: Path<ESTree.ExportAllDeclaration>, reexportModuleIndex: number): void {
  const tempIdentifier = path.scope.declareTemporary(`__export${reexportModuleIndex}`);

  path.replace(
    importModule(tempIdentifier, reexportModuleIndex),
    exportAllKeys(tempIdentifier)
  );
}

function replaceExportNamedDeclaration(path: Path<ESTree.ExportNamedDeclaration>): void {
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

function replaceReexportRename(path: Path<ESTree.ExportNamedDeclaration>, reexportModuleIndex: number): void {
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

function replaceExportRename(path: Path<ESTree.ExportNamedDeclaration>): void {
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

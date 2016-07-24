import { visit, builders as b, namedTypes as n, IPath, IVisitor } from 'ast-types';

import { getModuleIndex, enqueueModule } from '../modules';
import { getModulePath } from '../module-path';
import { IPaeckchenContext } from '../bundle';
import { State } from '../state';

export function rewriteRequireStatements(program: ESTree.Program, currentModule: string,
    context: IPaeckchenContext, state: State): Promise<void> {
  return Promise.resolve()
    .then(() => {
      context.logger.trace('plugin', `rewriteRequireStatements [currentModule=${currentModule}]`);
    })
    .then(() => {
      const requireUpdates: [string, IPath<ESTree.CallExpression>][] = [];

      visit(program, {
        visitCallExpression(this: IVisitor, path: IPath<ESTree.CallExpression>): boolean|void {
          const callee = path.node.callee;
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

      return Promise.all(requireUpdates.map(update => {
        const [requirePath, path] = update;
        return getModulePath(currentModule, requirePath, context)
          .then(modulePath => {
            const moduleIndex = getModuleIndex(modulePath, state);
            replaceRequireCall(path, moduleIndex);
            enqueueModule(modulePath, state, context);
          });
      }));
    });
}

function replaceRequireCall(path: IPath<ESTree.CallExpression>, moduleIndex: number): void {
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

import { builders as b } from 'ast-types';
import { IPaeckchenContext } from './bundle';

export function buildValue(data: any): ESTree.ObjectExpression|ESTree.ArrayExpression|ESTree.Literal {
  if (data === null) {
    return b.literal(null);
  }
  switch (typeof data) {
    case 'number':
    case 'string':
    case 'boolean':
      return b.literal(data);
    default:
      if (Array.isArray(data)) {
        return buildArray(data);
      }
      return buildObject(data);
  }
};

export function buildObject(data: Object): ESTree.ObjectExpression {
  return b.objectExpression(
    Object.keys(data).reduce((list: any[], key: string) => {
      list.push(b.property('init', b.literal(key), buildValue((data as any)[key])));
      return list;
    }, [])
  );
};

export function buildArray(data: any[]): ESTree.ArrayExpression {
  return b.arrayExpression(
    data.map(element => buildValue(element))
  );
}

export function wrapJsonFile(modulePath: string, context: IPaeckchenContext): Promise<ESTree.Program> {
  return context.host.readFile(modulePath)
    .then(data => JSON.parse(data))
    .then(data => {
      return b.program([
        b.expressionStatement(
          b.assignmentExpression(
            '=',
            b.memberExpression(
              b.identifier('module'),
              b.identifier('exports'),
              false
            ),
            buildValue(data)
          )
        )
      ]);
    });
}

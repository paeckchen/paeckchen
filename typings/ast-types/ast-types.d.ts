declare module 'ast-types' {

  export interface IPath<T> {
    node: T;
    replace(...newNode: any[]): void;
    insertAfter(newNode: any): void;
    prune(): void;
  }

  export function visit(ast: ESTree.Node, visitors: any): void;

  export namespace namedTypes {
    export namespace VariableDeclaration {
      export function check(object: any): object is ESTree.VariableDeclaration;
    }
    export namespace Identifier {
      export function check(object: any): object is ESTree.Identifier;
    }
    export namespace CallExpression {
      export function check(object: any): object is ESTree.CallExpression;
    }
    export namespace FunctionDeclaration {
      export function check(object: any): object is ESTree.FunctionDeclaration;
    }
    export namespace FunctionExpression {
      export function check(object: any): object is ESTree.FunctionExpression;
    }
    export namespace ClassDeclaration {
      export function check(object: any): object is ESTree.ClassDeclaration;
    }
    export namespace Literal {
      export function check(object: any): object is ESTree.Literal;
    }
    export namespace ImportSpecifier {
      export function check(object: any): object is ESTree.ImportSpecifier;
    }
    export namespace ImportDefaultSpecifier {
      export function check(object: any): object is ESTree.ImportDefaultSpecifier;
    }
    export namespace ImportNamespaceSpecifier {
      export function check(object: any): object is ESTree.ImportNamespaceSpecifier;
    }
  }

  export namespace builders {
    export function literal(value: any): ESTree.Literal;
    export function identifier(name: string): ESTree.Identifier;
    export function assignmentExpression(operator: string, left: any, right: any): ESTree.AssignmentExpression;
    export function memberExpression(object: any, property: any, computed: boolean): ESTree.MemberExpression;
    export function callExpression(callee: any, arguments: any[]): ESTree.CallExpression;
    export function functionExpression(id: any, params: any, body: any): ESTree.FunctionExpression;
    export function expressionStatement(expression: any): ESTree.ExpressionStatement;
    export function blockStatement(body: any[]): ESTree.BlockStatement;
    export function variableDeclaration(kind: 'var'|'let'|'const', declarations: any[]): ESTree.VariableDeclaration;
    export function variableDeclarator(id: any, init?: any): ESTree.VariableDeclarator;
    export function ifStatement(test: ESTree.Expression, consequent: ESTree.Statement, alternate?: ESTree.Statement): ESTree.IfStatement;
    export function unaryExpression(operator: ESTree.UnaryOperator, argument: ESTree.Expression): ESTree.UnaryExpression;
    export function objectExpression(properties: ESTree.Property[]): ESTree.ObjectExpression;
    export function property(kind: 'init'|'get'|'set', key: ESTree.Literal|ESTree.Identifier, value: ESTree.Expression): ESTree.Property;
    export function returnStatement(argument?: ESTree.Expression): ESTree.ReturnStatement;
  }
}

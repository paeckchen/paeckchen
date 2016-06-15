declare module 'ast-types' {

  export interface IPath<T> {
    node: T;
    replace(...newNode: any[]): void;
    insertAfter(newNode: any): void;
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
    export function literal(value: any): any;
    export function identifier(name: string): any;
    export function assignmentExpression(operator: string, left: any, right: any): any;
    export function memberExpression(object: any, property: any, computed: boolean): any;
    export function callExpression(callee: any, arguments: any[]): any;
    export function functionExpression(id: any, params: any, body: any): any;
    export function expressionStatement(expression: any): any;
    export function blockStatement(body: any[]): any;
    export function variableDeclaration(kind: 'var'|'let'|'const', declarations: any[]): any;
    export function variableDeclarator(id: any, init?: any): any;
  }
}

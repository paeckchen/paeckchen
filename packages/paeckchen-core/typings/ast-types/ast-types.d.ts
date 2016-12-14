declare module 'ast-types' {
  import * as ESTree from 'estree';

  export interface IScope {
    didScan: boolean;
    declares(name: string): boolean;
    declaresType(name: string): boolean;
    declareTemporary(prefix: string): ESTree.Identifier;
    injectTemporary(identifier: ESTree.Identifier, init?: ESTree.Expression): ESTree.Identifier;
    scan(force?: boolean): void;
    getBindings(): any;
    getTypes(): any;
    lookup(name: string): IScope;
    lookupType(name: string): IScope;
    getGlobalScope(): IScope;
  }

  export interface Path<T> {
    node: T;
    scope: IScope;
    get<CT>(...name: (string|number)[]): INodePath<CT>;
    replace(...newNode: any[]): void;
    insertBefore(newNode: any): void;
    insertAfter(newNode: any): void;
    prune(): void;
  }

  export interface INodePath<T> extends Path<T> {
    value: T;
  }

  export function visit(ast: ESTree.Node, visitors: any): void;

  export interface Visitor {
    abort(): void;
    traverse<T>(path: Path<T>): void;
  }

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
    export function program(body: ESTree.Statement[]): ESTree.Program;
    export function literal(value: any): ESTree.Literal;
    export function identifier(name: string): ESTree.Identifier;
    export function assignmentExpression(operator: ESTree.AssignmentOperator, left: ESTree.Pattern, right: ESTree.Expression): ESTree.AssignmentExpression;
    export function memberExpression(object: ESTree.Expression, property: ESTree.Identifier|ESTree.Expression, computed: boolean): ESTree.MemberExpression;
    export function callExpression(callee: any, _arguments: any[]): ESTree.CallExpression;
    export function thisExpression(): ESTree.ThisExpression;
    export function functionExpression(id: ESTree.Identifier|null, params: ESTree.Pattern[], body: ESTree.BlockStatement): ESTree.FunctionExpression;
    export function expressionStatement(expression: ESTree.Expression): ESTree.ExpressionStatement;
    export function blockStatement(body: ESTree.Statement[]): ESTree.BlockStatement;
    export function throwStatement(argument: ESTree.Expression): ESTree.ThrowStatement;
    export function variableDeclaration(kind: 'var'|'let'|'const', declarations: any[]): ESTree.VariableDeclaration;
    export function variableDeclarator(id: ESTree.Pattern, init?: ESTree.Expression): ESTree.VariableDeclarator;
    export function ifStatement(test: ESTree.Expression, consequent: ESTree.Statement, alternate?: ESTree.Statement): ESTree.IfStatement;
    export function unaryExpression(operator: ESTree.UnaryOperator, argument: ESTree.Expression): ESTree.UnaryExpression;
    export function objectExpression(properties: ESTree.Property[]): ESTree.ObjectExpression;
    export function property(kind: 'init'|'get'|'set', key: ESTree.Literal|ESTree.Identifier, value: ESTree.Expression): ESTree.Property;
    export function arrayExpression(elements?: ESTree.Expression[]): ESTree.ArrayExpression;
    export function returnStatement(argument?: ESTree.Expression): ESTree.ReturnStatement;
    export function newExpression(callee: ESTree.Expression, _arguments: ESTree.Expression[]): ESTree.NewExpression;
    export function sequenceExpression(expressions: ESTree.Expression[]): ESTree.Expression;
  }
}

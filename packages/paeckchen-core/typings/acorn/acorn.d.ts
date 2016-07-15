/// <reference path="../estree/estree.d.ts" />
declare module 'acorn' {

  export interface IParseOptions {
    ecmaVersion?: number;
    sourceType?: 'script' | 'module';
    onInsertedSemicolon?: Function;
    onTrailingComma?: Function;
    allowReserved?: boolean | 'never';
    allowReturnOutsideFunction?: boolean;
    allowImportExportEverywhere?: boolean;
    allowHashBang?: boolean;
    locations?: boolean;
    onToken?: Function | any[];
    onComment?: Function | any[];
    ranges?: boolean;
    program?: ESTree.Program;
    sourceFile?: string;
    directSourceFile?: any;
    preserveParens?: boolean;
    plugins?: any;
  }

  export class Node {
    public type: string;
    public start: number;
    public end: number;
    public loc: Location;
    public sourceFile: any;
    public range: [number, number];
  }

  export function parse(input: string, options?: IParseOptions): ESTree.Program;
}
declare module 'acorn/dist/walk' {
  export function simple(node: ESTree.Node, visitors: any): void;
}

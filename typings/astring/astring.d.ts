declare module 'astring' {

  function astring(node: ESTree.Node, options?: astring.IAstringOptions): string;

  namespace astring {
    export interface IAstringOptions {
      indent?: string;
      lineEnd?: string;
      startingIndentLevel?: number;
      comments?: boolean;
      output?: NodeJS.WritableStream;
      generator?: any;
    }
  }

  export = astring;
}

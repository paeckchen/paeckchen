import { dirname, join, resolve, sep } from 'path';
import { runInNewContext } from 'vm';
import { parse as acornParse, IParseOptions } from 'acorn';
import { attachComments } from 'estraverse';
import { generate as escodegenGenerate } from 'escodegen';
import { merge } from 'lodash';
import { oneLine } from 'common-tags';
import { IHost } from '../src/host';

export class HostMock implements IHost {
  public pathSep: string = sep;

  public basePath: string;
  public files: any = {};

  constructor(files: {[path: string]: string}, basePath: string = process.cwd()) {
    this.fileExists = this.fileExists.bind(this);
    this.isFile = this.isFile.bind(this);
    this.readFile = this.readFile.bind(this);
    this.joinPath = this.joinPath.bind(this);
    this.dirname = this.dirname.bind(this);

    this.basePath = resolve(basePath);

    this.files = Object
      .keys(files)
      .reduce((registry: any, propertyName: string) => {
        const resolved = resolve(this.basePath, propertyName);
        registry[resolved] = files[propertyName];
        return registry;
      }, {});
  }

  public cwd(): string {
    return this.basePath;
  }

  public fileExists(filePath: string): boolean {
    return resolve(filePath) in this.files;
  }

  public isFile(filePath: string): boolean {
    return resolve(filePath) in this.files;
  }

  public readFile(filePath: string): string {
    if (this.fileExists(filePath)) {
      return this.files[resolve(filePath)];
    }
    throw new Error(oneLine`ENOENT: Could not read file ${resolve(filePath)} from HostMock fs.
      Available files: ${Object.keys(this.files)}`);
  }

  public writeFile(filePath: string, content: string): void {
    this.files[resolve(filePath)] = content;
  }

  public joinPath(...paths: string[]): string {
    return join(...paths);
  }

  public dirname(filePath: string): string {
    return dirname(filePath);
  }
}

export function parse(input: string): ESTree.Program {
  const comments: any[] = [];
  const tokens: any[] = [];
  const acornOptions: IParseOptions = {
    ecmaVersion: 7,
    sourceType: 'module',
    locations: true,
    ranges: true,
    allowHashBang: true,
    onComment: comments,
    onToken: tokens
  };
  const ast = acornParse(input, acornOptions);
  attachComments(ast, comments, tokens);
  return ast;
}

export function generate(ast: ESTree.Program): string {
  return escodegenGenerate(ast, {comment: true}).trim();
}

export function parseAndProcess(input: string, fn: (ast: ESTree.Program) => void): string {
  const ast = parse(input);
  fn(ast);
  return generate(ast);
}

const defaultSandbox = {
  console,
  module: {
    exports: {}
  },
  require
};

export type virtualModuleResult = {[name: string]: any};
export function virtualModule(code: string, optionsSandbox = {}, requireResults: any[] = []): virtualModuleResult {
  const sandbox: any = merge({}, defaultSandbox, optionsSandbox);
  if (requireResults.length > 0) {
    sandbox.__paeckchen_require__ = function(idx: number): any {
      return requireResults[idx];
    };
  }
  runInNewContext(code, sandbox);
  return sandbox.module.exports;
}

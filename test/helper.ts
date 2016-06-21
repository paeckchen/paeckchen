import { join, dirname, resolve } from 'path';
import { runInNewContext } from 'vm';
import { parse, IParseOptions } from 'acorn';
import * as astringNode from 'astring';
const astring: typeof astringNode = astringNode as any;
import { merge } from 'lodash';
import { IHost } from '../src/host';

export class HostMock implements IHost {
  public pathSep: string = '/';

  private basePath: string = process.cwd()
  private files: any = {};

  constructor(files: {[path: string]: string}, basePath: string = process.cwd()) {
    this.fileExists = this.fileExists.bind(this);
    this.isFile = this.isFile.bind(this);
    this.readFile = this.readFile.bind(this);
    this.joinPath = this.joinPath.bind(this);
    this.dirname = this.dirname.bind(this);

    this.basePath = basePath;

    this.files = Object
      .keys(files)
      .reduce((registry: any, propertyName: string) => {
        const resolved = resolve(this.basePath, propertyName);
        registry[resolved] = files[propertyName];
        return registry;
      }, {});
  }

  public fileExists(filePath: string): boolean {
    return filePath in this.files;
  }

  public isFile(filePath: string): boolean {
    return filePath in this.files;
  }

  public readFile(filePath: string): string {
    if (this.fileExists(filePath)) {
      return this.files[filePath];
    }
    throw new Error(`ENOENT: Could not read file ${filePath} from HostMock fs. Available files: ${Object.keys(this.files)}`);
  }

  public joinPath(...paths: string[]): string {
    return join(...paths);
  }

  public dirname(filePath: string): string {
    return dirname(filePath);
  }
}

const acornOptions: IParseOptions = {
  ecmaVersion: 7,
  sourceType: 'module',
  locations: true,
  ranges: true,
  allowHashBang: true
};

export function parseAndProcess(input: string, fn: (ast: ESTree.Program) => void): string {
  const ast = parse(input, acornOptions);
  fn(ast);
  return astring(ast).trim();
}

const defaultSandbox = {
  console,
  module: {
    exports: {}
  },
  require
};

export function virtualModule(code: string, optionsSandbox = {}) {
  const sandbox = merge({}, defaultSandbox, optionsSandbox);
  runInNewContext(code, sandbox);
  return sandbox.module.exports as {[name?: string]: any};
}

import { join, dirname } from 'path';
import { parse, IParseOptions } from 'acorn';
import * as astringNode from 'astring';
const astring: typeof astringNode = astringNode as any;
import { IHost } from '../src/host';

export class HostMock implements IHost {
  public pathSep: string = '/';

  constructor(public files: {[path: string]: string}) {}

  public fileExists(path: string): boolean {
    return Object.keys(this.files).indexOf(path) > -1;
  };
  public isFile(path: string): boolean {
    return Object.keys(this.files).indexOf(path) > -1;
  }
  public readFile(path: string): string { return this.files[path]; };
  public joinPath(...paths: string[]): string { return join(...paths); };
  public dirname(path: string): string { return dirname(path); };
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

import * as acorn from 'acorn';
import { oneLine } from 'common-tags';
import { generate as escodegenGenerate } from 'escodegen';
import * as ESTree from 'estree';
import { merge } from 'lodash';
import { resolve } from 'path';
import { runInNewContext } from 'vm';

import { Host } from '../src/host';
import { FSWatcher } from '../src/watcher';
import { ChokidarMock } from './watcher-test';

export const errorLogger = {
  configure: () => undefined,
  trace: () => undefined,
  debug: () => undefined,
  info: () => undefined,
  error: (section: string, error: Error, message: string) => {
    console.log(`${message}: ${error.message}`);
  },
  progress: () => undefined
};

export class HostMock implements Host {
  public basePath: string;
  public files: any = {};

  constructor(files: {[path: string]: string}, basePath: string = process.cwd()) {
    this.fileExists = this.fileExists.bind(this);
    this.isFile = this.isFile.bind(this);
    this.readFile = this.readFile.bind(this);

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

  public async isFile(filePath: string): Promise<boolean> {
    return resolve(filePath) in this.files;
  }

  public async readFile(filePath: string): Promise<string> {
    if (this.fileExists(filePath)) {
      return this.files[resolve(filePath)];
    }
    throw new Error(oneLine`ENOENT: Could not read file ${resolve(filePath)} from HostMock fs.
      Available files: ${Object.keys(this.files)}`);
  }

  public writeFile(filePath: string, content: string): void {
    this.files[resolve(filePath)] = content;
  }

  public getModificationTime(path: string): Promise<number> {
    return Promise.resolve(0);
  }

  public createWatcher(): FSWatcher {
    return new FSWatcher(new ChokidarMock());
  }

}

export async function parse(input: string): Promise<ESTree.Program> {
  const acornOptions: acorn.Options = {
    ecmaVersion: 7,
    sourceType: 'module',
    locations: true,
    ranges: true,
    allowHashBang: true
  };
  const ast = acorn.parse(input, acornOptions);
  return ast;
}

export async function generate(ast: ESTree.Program): Promise<string> {
  return (escodegenGenerate(ast, {comment: true, format: { quotes: 'double' }}) as string).trim();
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

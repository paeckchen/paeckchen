import { assert } from 'chai';
import { join, dirname, resolve } from 'path';

import { IHost } from '../src/host';
import { getModuleIndex, wrapModule, updateModule } from '../src/modules';

class TestHost implements IHost {
  constructor(public files: {[path: string]: string}) {}

  public pathSep: string = '/';

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

describe('getModuleIndex', () => {
  it('should return a new index per requested file', () => {
    assert.equal(getModuleIndex('a/b/c'), 0);
    assert.equal(getModuleIndex('a/b/d'), 1);
  });

  it('should return the same index if duplicate request', () => {
    assert.equal(getModuleIndex('a/b/c'), 0);
    assert.equal(getModuleIndex('a/b/c'), 0);
  });

  it('should ignore file extension', () => {
    assert.equal(getModuleIndex('a/b/c'), 0);
    assert.equal(getModuleIndex('a/b/c.js'), 0);
  });
});

describe('wrapModule', () => {
  beforeEach(() => {
    updateModule(resolve('some/mod').replace(/\..*?$/, ''));
  });

  it('should wrap a module', () => {
    const modules: any[] = [];
    const plugins = {};
    const host = new TestHost({
      'some/mod.js': 'console.log("test");'
    });

    wrapModule('some/mod.js', modules, plugins, host);

    assert.lengthOf(Object.keys(modules), 1);
  });

  it('should call all given plugins', () => {
    const modules: any[] = [];
    let pluginCalls = 0;
    const plugins = {
      a: function(): void { pluginCalls++; },
      b: function(): void { pluginCalls++; }
    };
    const host = new TestHost({
      'some/mod.js': 'console.log("test");'
    });

    wrapModule('some/mod.js', modules, plugins, host);

    assert.equal(pluginCalls, 2);
  });
});

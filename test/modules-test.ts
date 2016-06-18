import { assert } from 'chai';
import { resolve } from 'path';

import { HostMock } from './helper';
import { getModuleIndex, wrapModule, updateModule } from '../src/modules';

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
    updateModule(resolve('some/mod').replace(/\.js$/, ''));
  });

  it('should wrap a module', () => {
    const modules: any[] = [];
    const plugins = {};
    const host = new HostMock({
      'some/mod.js': 'console.log("test");'
    });

    wrapModule('some/mod.js', modules, host, plugins);

    assert.lengthOf(Object.keys(modules), 1);
  });

  it('should call all given plugins', () => {
    const modules: any[] = [];
    let pluginCalls = 0;
    const plugins = {
      a: function(): void { pluginCalls++; },
      b: function(): void { pluginCalls++; }
    };
    const host = new HostMock({
      'some/mod.js': 'console.log("test");'
    });

    wrapModule('some/mod.js', modules, host, plugins);

    assert.equal(pluginCalls, 2);
  });
});

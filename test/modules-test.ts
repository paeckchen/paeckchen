import test from 'ava';

import { resolve } from 'path';

import { HostMock } from './helper';
import { getModuleIndex, wrapModule, updateModule } from '../src/modules';

test('getModuleIndex should return a new index per requested file', t => {
  t.deepEqual(getModuleIndex('a/b/c'), 0);
  t.deepEqual(getModuleIndex('a/b/d'), 1);
});

test('getModuleIndex should return the same index if duplicate request', t => {
  t.deepEqual(getModuleIndex('a/b/c'), 0);
  t.deepEqual(getModuleIndex('a/b/c'), 0);
});

test('getModuleIndex should ignore file extension', t => {
  t.deepEqual(getModuleIndex('a/b/c'), 0);
  t.deepEqual(getModuleIndex('a/b/c.js'), 0);
});

test.beforeEach(() => {
  updateModule(resolve('some/mod').replace(/\.js$/, ''));
});

test('wrapModule should wrap a module', t => {
  const modules: any[] = [];
  const plugins = {};
  const host = new HostMock({
    'some/mod.js': 'console.log("test");'
  });

  wrapModule('some/mod.js', modules, host, plugins);

  t.deepEqual(Object.keys(modules).length, 1);
});

test('wrapModule should call all given plugins', t => {
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

  t.deepEqual(pluginCalls, 2);
});

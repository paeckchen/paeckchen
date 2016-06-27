import test from 'ava';
import { visit } from 'ast-types';

import { HostMock, generate } from './helper';
import { getModuleIndex, updateModule, enqueueModule, bundleNextModule, reset } from '../src/modules';

test.beforeEach(() => {
  reset();
});

test('getModuleIndex should return a new index per requested file', t => {
  t.deepEqual(getModuleIndex('a/b/c'), 0);
  t.deepEqual(getModuleIndex('a/b/d'), 1);
});

test('getModuleIndex should return the same index if duplicate request', t => {
  t.deepEqual(getModuleIndex('a/b/c'), 0);
  t.deepEqual(getModuleIndex('a/b/c'), 0);
});

test.beforeEach(() => {
  updateModule('/some/mod.js');
});

test('bundleNextModule with empty queue return false', t => {
  const modules: any[] = [];
  const plugins = {};
  const globals = {
    global: false,
    process: false,
    buffer: false
  };
  const host = new HostMock({});

  t.false(bundleNextModule(modules, host, globals, plugins));
});

test('bundleNextModule should wrap a module', t => {
  const modules: any[] = [];
  const plugins = {};
  const globals = {
    global: false,
    process: false,
    buffer: false
  };
  const host = new HostMock({
    'some/mod.js': 'console.log("test");'
  }, '/');

  enqueueModule('/some/mod.js');
  bundleNextModule(modules, host, globals, plugins);

  t.deepEqual(Object.keys(modules).length, 1);
});

test('bundleNextModule should call all given plugins', t => {
  const modules: any[] = [];
  let pluginCalls = 0;
  const plugins = {
    a: function(): void { pluginCalls++; },
    b: function(): void { pluginCalls++; }
  };
  const globals = {
    global: false,
    process: false,
    buffer: false
  };
  const host = new HostMock({
    '/some/mod.js': 'console.log("test");'
  }, '/');

  enqueueModule('/some/mod.js');
  bundleNextModule(modules, host, globals, plugins);

  t.deepEqual(pluginCalls, 2);
});

test('bundleNextModule should not rebundle modules if already up to date', t => {
  const modules: any[] = [];
  const plugins = {};
  const globals = {
    global: false,
    process: false,
    buffer: false
  };
  const host = new HostMock({
    'some/mod.js': 'console.log("test");'
  }, '/');

  enqueueModule('/some/mod.js');
  bundleNextModule(modules, host, globals, plugins);
  const firstBundled = modules[0];

  enqueueModule('/some/mod.js');
  bundleNextModule(modules, host, globals, plugins);

  t.is(modules[0], firstBundled);
});

test('bundleNextModule should rebundle modules if updated', t => {
  const modules: any[] = [];
  const plugins = {};
  const globals = {
    global: false,
    process: false,
    buffer: false
  };
  const host = new HostMock({
    'some/mod.js': 'console.log("test");'
  }, '/');

  enqueueModule('/some/mod.js');
  bundleNextModule(modules, host, globals, plugins);
  const firstBundled = modules[0];

  updateModule('/some/mod.js');
  enqueueModule('/some/mod.js');
  bundleNextModule(modules, host, globals, plugins);

  t.not(modules[0], firstBundled);
});

test('enqueueModule should not accept duplicate entries', t => {
  const modules: any[] = [];
  const plugins = {};
  const globals = {
    global: false,
    process: false,
    buffer: false
  };
  const host = new HostMock({
    'some/mod.js': 'console.log("test");'
  }, '/');

  enqueueModule('/some/mod.js');
  enqueueModule('/some/mod.js');
  bundleNextModule(modules, host, globals, plugins);
  t.false(bundleNextModule(modules, host, globals, plugins));
});

test('bundleNextModule should throw if an error occurred', t => {
  const modules: any[] = [];
  const plugins = {};
  const globals = {
    global: false,
    process: false,
    buffer: false
  };
  const host = new HostMock({
    '/some/mod.js': '/'
  });

  enqueueModule('/some/mod.js');
  t.throws(() => {
    bundleNextModule(modules, host, globals, plugins);
  });
});

test('bundleNextModule should bundle an error for unavailable modules', t => {
  const modules: any[] = [];
  const plugins = {};
  const globals = {
    global: false,
    process: false,
    buffer: false
  };
  const host = new HostMock({});

  enqueueModule('fs');
  bundleNextModule(modules, host, globals, plugins);

  let throws = false;
  visit(modules[0], {
    visitThrowStatement: function(): boolean {
      throws = true;
      return false;
    }
  });
  t.true(throws);
});

test('bundleNextModule should remove sourceMapping comments', t => {
  const modules: any[] = [];
  const plugins = {};
  const globals = {
    global: false,
    process: false,
    buffer: false
  };
  const host = new HostMock({
    '/some/mod.js': `
      var a = 0;
      //# sourceMappingURL=foobar.js.map
    `
  });

  enqueueModule('/some/mod.js');
  bundleNextModule(modules, host, globals, plugins);

  t.is(generate(modules[0]).indexOf('# sourceMappingURL='), -1);
});

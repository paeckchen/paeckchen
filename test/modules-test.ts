import test from 'ava';
import { visit } from 'ast-types';
import { runInNewContext } from 'vm';

import { State } from '../src/state';
import { HostMock, generate } from './helper';
import { getModuleIndex, updateModule, enqueueModule, bundleNextModule } from '../src/modules';

test('getModuleIndex should return a new index per requested file', t => {
  const state = new State([]);

  t.deepEqual(getModuleIndex('a/b/c', state), 0);
  t.deepEqual(getModuleIndex('a/b/d', state), 1);
});

test('getModuleIndex should return the same index if duplicate request', t => {
  const state = new State([]);

  t.deepEqual(getModuleIndex('a/b/c', state), 0);
  t.deepEqual(getModuleIndex('a/b/c', state), 0);
});

test('bundleNextModule with empty queue return false', t => {
  const state = new State([]);
  const plugins = {};
  const host = new HostMock({});

  t.false(bundleNextModule(state, { config: { externals: {} } as any, host }, plugins));
});

test('bundleNextModule should wrap a module', t => {
  const state = new State([]);
  const plugins = {};
  const host = new HostMock({
    'some/mod.js': 'console.log("test");'
  }, '/');

  enqueueModule('/some/mod.js');
  bundleNextModule(state, { config: { externals: {} } as any, host }, plugins);

  t.deepEqual(Object.keys(state.modules).length, 1);
});

test('bundleNextModule should call all given plugins', t => {
  const state = new State([]);
  let pluginCalls = 0;
  const plugins = {
    a: function(): void { pluginCalls++; },
    b: function(): void { pluginCalls++; }
  };
  const host = new HostMock({
    '/some/mod.js': 'console.log("test");'
  }, '/');

  enqueueModule('/some/mod.js');
  bundleNextModule(state, { config: { externals: {} } as any, host }, plugins);

  t.deepEqual(pluginCalls, 2);
});

test('bundleNextModule should not rebundle modules if already up to date', t => {
  const state = new State([]);
  const plugins = {};
  const host = new HostMock({
    'some/mod.js': 'console.log("test");'
  }, '/');

  enqueueModule('/some/mod.js');
  bundleNextModule(state, { config: { externals: {} } as any, host }, plugins);
  const firstBundled = state.modules[0];

  enqueueModule('/some/mod.js');
  bundleNextModule(state, { config: { externals: {} } as any, host }, plugins);

  t.is(state.modules[0], firstBundled);
});

test('bundleNextModule should rebundle modules if updated', t => {
  const state = new State([]);
  const plugins = {};
  const host = new HostMock({
    'some/mod.js': 'console.log("test");'
  }, '/');

  enqueueModule('/some/mod.js');
  bundleNextModule(state, { config: { externals: {} } as any, host }, plugins);
  const firstBundled = state.modules[0];

  updateModule('/some/mod.js', state);
  enqueueModule('/some/mod.js');
  bundleNextModule(state, { config: { externals: {} } as any, host }, plugins);

  t.not(state.modules[0], firstBundled);
});

test('enqueueModule should not accept duplicate entries', t => {
  const state = new State([]);
  const plugins = {};
  const host = new HostMock({
    'some/mod.js': 'console.log("test");'
  }, '/');

  enqueueModule('/some/mod.js');
  enqueueModule('/some/mod.js');
  bundleNextModule(state, { config: { externals: {} } as any, host }, plugins);
  t.false(bundleNextModule(state, { config: { externals: {} } as any, host }, plugins));
});

test('bundleNextModule should throw if an error occurred', t => {
  const state = new State([]);
  const plugins = {};
  const host = new HostMock({
    '/some/mod.js': '/'
  });

  enqueueModule('/some/mod.js');
  t.throws(() => {
    bundleNextModule(state, { config: { externals: {} } as any, host }, plugins);
  });
});

test('bundleNextModule should bundle a virtual module per external configuration', t => {
  const state = new State([]);
  const plugins = {};
  const host = new HostMock({});

  enqueueModule('fs');
  bundleNextModule(state, { config: { externals: { fs: 'fsShim' } } as any, host }, plugins);

  const sandbox = {
    fsShim: {},
    module: {
      exports: {
      }
    }
  };
  runInNewContext(generate(state.modules[0] as any) + '_0(module, module.exports);', sandbox);
  t.is(sandbox.module.exports, sandbox.fsShim);
});

test('bundleNextModule should bundle a virtual empty module per external falsy configuration', t => {
  const state = new State([]);
  const plugins = {};
  const host = new HostMock({});

  enqueueModule('fs');
  bundleNextModule(state, { config: { externals: { fs: false } } as any, host }, plugins);

  const sandbox = {
    module: {
      exports: {
      }
    }
  };
  runInNewContext(generate(state.modules[0] as any) + '_0(module, module.exports);', sandbox);
  t.deepEqual(sandbox.module.exports, {});
});

test('bundleNextModule should bundle an error for unavailable modules', t => {
  const state = new State([]);
  const plugins = {};
  const host = new HostMock({});

  enqueueModule('fs');
  bundleNextModule(state, { config: { externals: {} } as any, host }, plugins);

  let throws = false;
  visit(state.modules[0], {
    visitThrowStatement: function(): boolean {
      throws = true;
      return false;
    }
  });
  t.true(throws);
});

test('bundleNextModule should remove sourceMapping comments', t => {
  const state = new State([]);
  const plugins = {};
  const host = new HostMock({
    '/some/mod.js': `
      var a = 0;
      //# sourceMappingURL=foobar.js.map
    `
  });

  enqueueModule('/some/mod.js');
  bundleNextModule(state, { config: { externals: {} } as any, host }, plugins);

  t.is(generate(state.modules[0] as any).indexOf('# sourceMappingURL='), -1);
});

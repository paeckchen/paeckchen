import test from 'ava';
import { runInNewContext } from 'vm';

import { PaeckchenContext } from '../src/bundle';
import { NoopLogger } from '../src/logger';
import { State } from '../src/state';
import { HostMock, generate } from './helper';

import { getModuleIndex, updateModule, enqueueModule, bundleNextModules } from '../src/modules';

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

test('bundleNextModules with empty queue return false', t => {
  const state = new State([]);
  const plugins = {};
  const host = new HostMock({});
  const context = {
    config: {
      externals: {}
    } as any,
    host,
    logger: new NoopLogger()
  };

  t.deepEqual(bundleNextModules(state, context, plugins), []);
});

test('bundleNextModules should wrap a module', async t => {
  const state = new State([]);
  const plugins = {};
  const host = new HostMock({
    'some/mod.js': 'console.log("test");'
  }, '/');
  const context = {
    config: {
      externals: {}
    } as any,
    host,
    logger: new NoopLogger()
  };

  enqueueModule('/some/mod.js', state, context);
  await Promise.all(bundleNextModules(state, context, plugins));

  t.deepEqual(Object.keys(state.modules).length, 1);
});

test('bundleNextModules should call all given plugins', async t => {
  const state = new State([]);
  let pluginCalls = 0;
  const plugins = {
    a(): void { pluginCalls++; },
    b(): void { pluginCalls++; }
  };
  const host = new HostMock({
    '/some/mod.js': 'console.log("test");'
  }, '/');
  const context = {
    config: {
      externals: {}
    } as any,
    host,
    logger: new NoopLogger()
  };

  enqueueModule('/some/mod.js', state, context);
  await Promise.all(bundleNextModules(state, context, plugins));

  t.deepEqual(pluginCalls, 2);
});

test('bundleNextModules should not rebundle modules if already up to date', async t => {
  const state = new State([]);
  const plugins = {};
  const host = new HostMock({
    'some/mod.js': 'console.log("test");'
  }, '/');
  const context = {
    config: {
      externals: {}
    } as any,
    host,
    logger: new NoopLogger()
  };

  let firstBundled: any;
  enqueueModule('/some/mod.js', state, context);
  await Promise.all(bundleNextModules(state, context, plugins));
  firstBundled = state.modules[0];

  enqueueModule('/some/mod.js', state, context);
  await Promise.all(bundleNextModules(state, context, plugins));

  t.is(state.modules[0], firstBundled);
});

test('bundleNextModules should rebundle modules if updated', async t => {
  const state = new State([]);
  const plugins = {};
  const host = new HostMock({
    'some/mod.js': 'console.log("test");'
  }, '/');
  const context = {
    config: {
      externals: {}
    } as any,
    host,
    logger: new NoopLogger()
  };

  let firstBundled: any;
  enqueueModule('/some/mod.js', state, context);
  await Promise.all(bundleNextModules(state, context, plugins));
  firstBundled = state.modules[0];

  updateModule('/some/mod.js', false, state);
  enqueueModule('/some/mod.js', state, context);
  await Promise.all(bundleNextModules(state, context, plugins));

  t.not(state.modules[0], firstBundled);
});

test('enqueueModule should not accept duplicate entries', t => {
  const state = new State([]);
  const host = new HostMock({
    'some/mod.js': 'console.log("test");'
  }, '/');
  const context = {
    config: {
      externals: {}
    } as any,
    host,
    logger: new NoopLogger()
  };

  enqueueModule('/some/mod.js', state, context);
  enqueueModule('/some/mod.js', state, context);

  t.is(state.moduleBundleQueue.length, 1);
});

test('bundleNextModules should throw if an error occurred', async t => {
  const state = new State([]);
  const plugins = {};
  const host = new HostMock({
    '/some/mod.js': '/'
  });
  const context = {
    config: {
      externals: {}
    } as any,
    host,
    logger: new NoopLogger()
  };

  enqueueModule('/some/mod.js', state, context);
  try {
    await Promise.all(bundleNextModules(state, context, plugins));
    t.fail('Expected an error');
  } catch (e) {
    t.is(e.message, 'Unterminated regular expression (1:1)');
  }
});

test('bundleNextModules should bundle a virtual module per external configuration', async t => {
  const state = new State([]);
  const plugins = {};
  const host = new HostMock({});
  const context = {
    config: {
      externals: {
        fs: 'fsShim'
      }
    } as any,
    host,
    logger: new NoopLogger()
  };

  enqueueModule('fs', state, context);
  await Promise.all(bundleNextModules(state, context, plugins));
  const code = (await generate(state.modules[0] as any))  + '_0(module, module.exports);';

  const sandbox = {
    fsShim: {},
    module: {
      exports: {
      }
    }
  };
  runInNewContext(code, sandbox);
  t.is(sandbox.module.exports, sandbox.fsShim);
});

test('bundleNextModules should bundle a virtual empty module per external falsy configuration', async t => {
  const state = new State([]);
  const plugins = {};
  const host = new HostMock({});
  const context = {
    config: {
      externals: {
        fs: false
      }
    } as any,
    host,
    logger: new NoopLogger()
  };

  enqueueModule('fs', state, context);
  await Promise.all(bundleNextModules(state, context, plugins));
  const code = (await generate(state.modules[0] as any)) + '_0(module, module.exports);';

  const sandbox = {
    module: {
      exports: {
      }
    }
  };
  runInNewContext(code, sandbox);
  t.deepEqual(sandbox.module.exports, {});
});

test('bundleNextModules should bundle an error for removed modules', async t => {
  const state = new State([]);
  const plugins = {};
  let callMeOnChangesFunction: Function = () => t.fail();
  const context: PaeckchenContext = {
    config: {
      externals: {},
      watchMode: true
    } as any,
    host: new HostMock({
      '/test': ''
    }, '/'),
    logger: new NoopLogger(),
    watcher: {
      start(callMeOnChanges: Function): void {
        callMeOnChangesFunction = callMeOnChanges;
      },
      watchFile(fileName: string): void { /* */ }
    } as any,
    rebundle: () => { /* */ }
  };

  enqueueModule('/test', state, context);
  await Promise.all(bundleNextModules(state, context, plugins));
  callMeOnChangesFunction('remove', '/test');
  // call bundleNextModules here, because rebundle is a stub (see above) and
  // we need a bit more control here
  await Promise.all(bundleNextModules(state, context, plugins));
  const code = (await generate(state.modules[0] as any)) + '_0(module, module.exports);';

  const sandbox = {
    module: {
      exports: {
      }
    }
  };
  t.throws(() => {
    runInNewContext(code, sandbox);
  }, "Module '/test' was removed");
});

test('bundleNextModules should bundle an error for unavailable modules', async t => {
  const state = new State([]);
  const plugins = {};
  const host = new HostMock({});
  const context = {
    config: {
      externals: {}
    } as any,
    host,
    logger: new NoopLogger()
  };

  enqueueModule('fs', state, context);
  await Promise.all(bundleNextModules(state, context, plugins));
  const code = (await generate(state.modules[0] as any)) + '_0(module, module.exports);';

  const sandbox = {
    module: {
      exports: {
      }
    }
  };
  t.throws(() => {
    runInNewContext(code, sandbox);
  }, "Module 'fs' not found");
});

test('bundleNextModules should add modules to the watch list if enabled', async t => {
  let watchedFile: string|undefined;
  const state = new State([]);
  const host = new HostMock({
    '/some/mod.js': ''
  });
  const context: PaeckchenContext = {
    config: {
      externals: {},
      watchMode: true
    } as any,
    host,
    logger: new NoopLogger(),
    watcher: {
      start(): void { /* */ },
      watchFile(fileName: string): void {
        watchedFile = fileName;
      }
    } as any
  };

  enqueueModule('/some/mod.js', state, context);
  await Promise.all(bundleNextModules(state, context, {}));

  t.is(watchedFile, '/some/mod.js');
});

test('bundleNextModules should trigger rebundle on watched file update', async t => {
  const state = new State([]);
  let callMeOnChangesFunction: Function = () => t.fail();
  const host = new HostMock({
    '/some/mod.js': ''
  });
  let calledRebundle = false;
  const context: PaeckchenContext = {
    config: {
      externals: {},
      watchMode: true
    } as any,
    host,
    logger: new NoopLogger(),
    watcher: {
      start(callMeOnChanges: Function): void {
        callMeOnChangesFunction = callMeOnChanges;
      },
      watchFile(fileName: string): void { /* */ }
    } as any,
    rebundle: () => calledRebundle = true
  };

  enqueueModule('/some/mod.js', state, context);
  await Promise.all(bundleNextModules(state, context, {}));

  callMeOnChangesFunction('update', '/some/mod.js');

  t.true(calledRebundle);
});

test('bundleNextModules should trigger rebundle on watched file removal', async t => {
  const state = new State([]);
  let callMeOnChangesFunction: Function = () => t.fail();
  const host = new HostMock({
    '/some/mod.js': ''
  });
  let calledRebundle = false;
  const context: PaeckchenContext = {
    config: {
      externals: {},
      watchMode: true
    } as any,
    host,
    logger: new NoopLogger(),
    watcher: {
      start(callMeOnChanges: Function): void {
        callMeOnChangesFunction = callMeOnChanges;
      },
      watchFile(fileName: string): void { /* */ }
    } as any,
    rebundle: () => calledRebundle = true
  };

  enqueueModule('/some/mod.js', state, context);
  await Promise.all(bundleNextModules(state, context, {}));

  callMeOnChangesFunction('remove', '/some/mod.js');

  t.true(calledRebundle);
});

test('bundleNextModules should bundle json file', async t => {
  const state = new State([]);
  const host = new HostMock({
    '/some.json': '{"a": true}'
  });
  const context: PaeckchenContext = {
    config: {
      externals: {},
      watchMode: true
    } as any,
    host,
    logger: new NoopLogger(),
    watcher: {
      start: (): void => undefined,
      watchFile: (): void => undefined
    } as any
  };

  enqueueModule('/some.json', state, context);
  await Promise.all(bundleNextModules(state, context, {}));
  const code = (await generate(state.modules[0] as any)) + '_0(module, module.exports);';

  const sandbox = {
    module: {
      exports: {
      }
    }
  };
  runInNewContext(code, sandbox);
  t.deepEqual(sandbox.module.exports, {a: true} as any);
});

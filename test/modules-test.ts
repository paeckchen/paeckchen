import test from 'ava';
import { visit } from 'ast-types';
import { runInNewContext } from 'vm';
import { HostMock, generate } from './helper';
import { IPaeckchenContext } from '../src/bundle';

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
  updateModule('/some/mod.js', false);
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

  t.false(bundleNextModule(modules, { config: { externals: {} } as any, host }, globals, plugins));
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
  bundleNextModule(modules, { config: { externals: {} } as any, host }, globals, plugins);

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
  bundleNextModule(modules, { config: { externals: {} } as any, host }, globals, plugins);

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
  bundleNextModule(modules, { config: { externals: {} } as any, host }, globals, plugins);
  const firstBundled = modules[0];

  enqueueModule('/some/mod.js');
  bundleNextModule(modules, { config: { externals: {} } as any, host }, globals, plugins);

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
  bundleNextModule(modules, { config: { externals: {} } as any, host }, globals, plugins);
  const firstBundled = modules[0];

  updateModule('/some/mod.js', false);
  enqueueModule('/some/mod.js');
  bundleNextModule(modules, { config: { externals: {} } as any, host }, globals, plugins);

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
  bundleNextModule(modules, { config: { externals: {} } as any, host }, globals, plugins);
  t.false(bundleNextModule(modules, { config: { externals: {} } as any, host }, globals, plugins));
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
    bundleNextModule(modules, { config: { externals: {} } as any, host }, globals, plugins);
  });
});

test('bundleNextModule should bundle a virtual module per external configuration', t => {
  const modules: any[] = [];
  const plugins = {};
  const globals = {
    global: false,
    process: false,
    buffer: false
  };
  const host = new HostMock({});

  enqueueModule('fs');
  bundleNextModule(modules, { config: { externals: { fs: 'fsShim' } } as any, host }, globals, plugins);

  const sandbox = {
    fsShim: {},
    module: {
      exports: {
      }
    }
  };
  runInNewContext(generate(modules[0]) + '_0(module, module.exports);', sandbox);
  t.is(sandbox.module.exports, sandbox.fsShim);
});

test('bundleNextModule should bundle a virtual empty module per external falsy configuration', t => {
  const modules: any[] = [];
  const plugins = {};
  const globals = {
    global: false,
    process: false,
    buffer: false
  };
  const host = new HostMock({});

  enqueueModule('fs');
  bundleNextModule(modules, { config: { externals: { fs: false } } as any, host }, globals, plugins);

  const sandbox = {
    module: {
      exports: {
      }
    }
  };
  runInNewContext(generate(modules[0]) + '_0(module, module.exports);', sandbox);
  t.deepEqual(sandbox.module.exports, {});
});

test('bundleNextModule should bundle an error for removed modules', t => {
  const modules: any[] = [];
  const plugins = {};
  const globals = {
    global: false,
    process: false,
    buffer: false
  };
  let callMeOnChangesFunction: Function;
  const context: IPaeckchenContext = {
    config: {
      externals: {},
      watchMode: true
    } as any,
    host: new HostMock({
      '/test': ''
    }, '/'),
    watcher: {
      start(callMeOnChanges: Function): void {
        callMeOnChangesFunction = callMeOnChanges;
      },
      watchFile(fileName: string): void { /* */ }
    } as any,
    rebundle: () => { /* */ }
  };

  enqueueModule('/test');
  bundleNextModule(modules, context, globals, plugins);
  callMeOnChangesFunction('remove', '/test');
  bundleNextModule(modules, context, globals, plugins);

  const sandbox = {
    module: {
      exports: {
      }
    }
  };
  t.throws(() => {
    runInNewContext(generate(modules[0]) + '_0(module, module.exports);', sandbox);
  }, "Module '/test' was removed");
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
  bundleNextModule(modules, { config: { externals: {} } as any, host }, globals, plugins);

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
  bundleNextModule(modules, { config: { externals: {} } as any, host }, globals, plugins);

  t.is(generate(modules[0]).indexOf('# sourceMappingURL='), -1);
});

test('bundleNextModule should add modules to the watch list if enabled', t => {
  let watchedFile: string;
  const host = new HostMock({
    '/some/mod.js': ''
  });
  const context: IPaeckchenContext = {
    config: {
      externals: {},
      watchMode: true
    } as any,
    host,
    watcher: {
      start(): void { /* */ },
      watchFile(fileName: string): void {
        watchedFile = fileName;
      }
    } as any
  };

  enqueueModule('/some/mod.js');
  bundleNextModule([], context, {} as any, {});

  t.is(watchedFile, '/some/mod.js');
});

test('bundleNextModule should trigger rebundle on watched file update', t => {
  let callMeOnChangesFunction: Function;
  const host = new HostMock({
    '/some/mod.js': ''
  });
  let calledRebundle = false;
  const context: IPaeckchenContext = {
    config: {
      externals: {},
      watchMode: true
    } as any,
    host,
    watcher: {
      start(callMeOnChanges: Function): void {
        callMeOnChangesFunction = callMeOnChanges;
      },
      watchFile(fileName: string): void { /* */ }
    } as any,
    rebundle: () => calledRebundle = true
  };

  enqueueModule('/some/mod.js');
  bundleNextModule([], context, {} as any, {});
  callMeOnChangesFunction('update', '/some/mod.js');

  t.true(calledRebundle);
});

test('bundleNextModule should trigger rebundle on watched file removal', t => {
  let callMeOnChangesFunction: Function;
  const host = new HostMock({
    '/some/mod.js': ''
  });
  let calledRebundle = false;
  const context: IPaeckchenContext = {
    config: {
      externals: {},
      watchMode: true
    } as any,
    host,
    watcher: {
      start(callMeOnChanges: Function): void {
        callMeOnChangesFunction = callMeOnChanges;
      },
      watchFile(fileName: string): void { /* */ }
    } as any,
    rebundle: () => calledRebundle = true
  };

  enqueueModule('/some/mod.js');
  bundleNextModule([], context, {} as any, {});
  callMeOnChangesFunction('remove', '/some/mod.js');

  t.true(calledRebundle);
});

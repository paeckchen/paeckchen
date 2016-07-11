import test from 'ava';
import { join } from 'path';
import { HostMock, virtualModule } from './helper';
import { reset } from '../src/modules';

import { bundle, rebundleFactory, IPaeckchenContext, IBundleOptions } from '../src/bundle';

test.beforeEach(() => {
  reset();
});

test('bundle should bundle the given entry-point and its dependencies', t => {
  const host = new HostMock({
    'entry-point.js': `
      import fn from './dependency';
      fn();
    `,
    './dependency.js': `
      export default function() {
        callme();
      }
    `
  });

  const bundled = bundle({entryPoint: 'entry-point.js'}, host);

  let called = false;
  virtualModule(bundled, {
    callme: function(): void {
      called = true;
    }
  });
  t.true(called);
});

test('bundle should bundle global dependencies', t => {
  const host = new HostMock({
    '/entry-point.js': `
      Buffer.isBuffer();
    `,
    // npm2
    [join(process.cwd(), ...'../../node_modules/node-libs-browser/node_modules/buffer/index.js'.split('/'))]: `
      export const Buffer = {
        isBuffer() {
          callme();
        }
      };
    `,
    // npm3
    [join(process.cwd(), ...'../../node_modules/buffer/index.js'.split('/'))]: `
      export const Buffer = {
        isBuffer() {
          callme();
        }
      };
    `
  }, '/');

  const bundled = bundle({entryPoint: '/entry-point.js'}, host);

  let called = false;
  virtualModule(bundled, {
    callme: function(): void {
      called = true;
    }
  });
  t.true(called);
});

test('bundle should check for a config-file', t => {
  const host = new HostMock({
    '/entry-point.js': `
      callback();
    `,
    '/paeckchen.json': JSON.stringify({
        input: {
          entry: './entry-point'
        }
      })
  }, '/');

  const bundled = bundle({}, host);

  let called = false;
  virtualModule(bundled, {
    callback: function(): void {
      called = true;
    }
  });
  t.true(called);
});

test('bundle should throw if no entry-point configured', t => {
  const host = new HostMock({
    '/paeckchen.json': '{}'
  }, '/');

  t.throws(() => bundle({}, host), 'Missing entry-point');
});

test('bundle should write result to disk if output file given', t => {
  const host = new HostMock({
    '/paeckchen.json': JSON.stringify({
      input: {
        entry: './entry-point'
      },
      output: {
        file: 'result.js'
      }
    }),
    '/entry-point': `console.log("foo");`
  }, '/');

  bundle({}, host);

  t.true('/result.js' in host.files);
});

test.cb('rebundleFactory should return a function which calls a bundle function on the end of the event loop', t => {
  const ast: any = {};
  const modules: any = {};
  const context: any = {};
  const globals: any = {};
  const host: any = {};
  let bundleFunctionCalled = 0;
  const bundleFunction: any = (_ast: any, _modules: any, _context: any, _globals: any, _host: any) => {
    t.is(_ast, ast);
    t.is(_modules, modules);
    t.is(_context, context);
    t.is(_globals, globals);
    t.is(_host, host);
    bundleFunctionCalled++;
  };
  const rebundle = rebundleFactory(ast, modules, context, globals, host, bundleFunction);
  rebundle();
  rebundle();

  setTimeout(() => {
    t.is(bundleFunctionCalled, 1);
    t.end();
  }, 25);
});

test('bundle should create a watch and a rebundle function when in watch mode', t => {
  const host = new HostMock({
    '/entry': ''
  }, '/');
  let bundleFunctionCalled = 0;
  const rebundle = () => {
    //
  };
  const bundleFunction: any = (ast: any, modules: any, context: IPaeckchenContext) => {
    t.truthy(context.watcher);
    t.is(context.rebundle, rebundle);
    bundleFunctionCalled++;
  };
  const rebundleFactoryFunction: any = () => {
    return rebundle;
  };
  const config: IBundleOptions = {
    entryPoint: '/entry',
    watchMode: true
  };

  bundle(config, host, bundleFunction, rebundleFactoryFunction);

  t.is(bundleFunctionCalled, 1);
});

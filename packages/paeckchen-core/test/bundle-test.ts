import test from 'ava';
import { errorLogger, HostMock, virtualModule } from './helper';
import { State } from '../src/state';
import { DefaultHost } from '../src/host';

import { bundle, rebundleFactory, PaeckchenContext, BundleOptions } from '../src/bundle';

test.cb('bundle should bundle the given entry-point and its dependencies', t => {
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
  const options = {
    entryPoint: 'entry-point.js',
    logger: errorLogger
  };

  bundle(options, host, (error, context, code) => {
    if (error) {
      t.fail(error.message);
      return t.end();
    }
    let called = false;
    virtualModule(code as string, {
      callme: function(): void {
        called = true;
      }
    });
    t.true(called);
    t.end();
  });
});

test.cb('bundle should bundle global dependencies', t => {
  const host = new HostMock({
    '/entry-point.js': `
      Buffer.isBuffer();
    `,
    'BUFFER': `
      export const Buffer = {
        isBuffer() {
          callme();
        }
      };
    `
  }, '/');
  const config: BundleOptions = {
    entryPoint: '/entry-point.js',
    alias: 'buffer=/BUFFER'
  };

  bundle(config, host, (error, context, code) => {
    if (error) {
      t.fail(error.message);
      return t.end();
    }
    let called = false;
    virtualModule(code as string, {
      callme: function(): void {
        called = true;
      }
    });
    t.true(called);
    t.end();
  });
});

test.cb('bundle should check for a config-file', t => {
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

  bundle({}, host, (error, context, code) => {
    if (error) {
      t.fail(error.message);
      return t.end();
    }
    let called = false;
    virtualModule(code as string, {
      callback: function(): void {
        called = true;
      }
    });
    t.true(called);
    t.end();
  });
});

test.cb('bundle should throw if no entry-point configured', t => {
  const host = new HostMock({
    '/paeckchen.json': '{}'
  }, '/');

  return bundle({}, host, error => {
    if (error) {
      t.is(error.message, 'Missing entry-point');
      return t.end();
    }
    t.fail('Expected error');
    t.end();
  });
});

test.cb('rebundleFactory should return a function which calls a bundle function on the end of the event loop', t => {
  const state = new State([]);
  const ast: any = {};
  const context: any = {};
  let bundleFunctionCalled = 0;
  const bundleFunction: any = (_state: any, _ast: any, _context: any) => {
    t.is(_state, state);
    t.is(_ast, ast);
    t.is(_context, context);
    bundleFunctionCalled++;
  };
  const rebundle = rebundleFactory(state, ast, context, bundleFunction, () => undefined);
  rebundle();
  rebundle();

  setTimeout(() => {
    t.is(bundleFunctionCalled, 1);
    t.end();
  }, 25);
});

test.cb('bundle should create a watch and a rebundle function when in watch mode', t => {
  const host = new HostMock({
    '/entry': ''
  }, '/');
  const rebundle = () => {
    //
  };
  const bundleFunction: any = (ast: any, modules: any, context: PaeckchenContext) => {
    t.truthy(context.watcher);
    t.is(context.rebundle, rebundle);
    t.end();
  };
  const rebundleFactoryFunction: any = () => {
    return rebundle;
  };
  const config: BundleOptions = {
    entryPoint: '/entry',
    watchMode: true
  };

  const outputFunction = () => {
    t.fail('unexpected call');
    t.end();
  };
  bundle(config, host, outputFunction, bundleFunction, rebundleFactoryFunction);
});

test.cb('bundle with source maps should add mappings via sorcery', t => {
  const config: BundleOptions = {
    entryPoint: './fixtures/main.js',
    sourceMap: true
  };

  bundle(config, new DefaultHost(), (error, context, code, _sourceMap) => {
    if (error) {
      t.fail(error.message);
      return t.end();
    }
    const sourceMap = JSON.parse(_sourceMap as string);

    t.not(code, undefined);
    t.deepEqual(sourceMap.sources, ['../../test/fixtures/main.ts']);
    t.truthy((sourceMap.sourcesContent[0] as string).match(/: string/));
    t.end();
  });
});

test.cb('bundle should log on chunk error', t => {
  let errorLogged = false;

  const host = new HostMock({
    '/entry': 'function(){}'
  }, '/');
  const config: BundleOptions = {
    entryPoint: '/entry',
    logger: {
      configure(): void {
        //
      },
      trace(): void {
        //
      },
      debug(): void {
        //
      },
      info(): void {
        //
      },
      error(section, error, message): void {
        if (!errorLogged) {
          errorLogged = true;
          t.end();
        }
      },
      progress(): void {
        //
      }
    }
  };

  bundle(config, host, () => undefined);
});

test.cb('bundle should restart from cache if available', t => {
  const detectedGlobals = {
    global: true,
    buffer: true,
    process: true
  };
  const host = new HostMock({
    'paeckchen.cache.json': `{
      "paeckchenAst": {
        "body": [
          {},
          {},
          {
            "declarations": [
              {
                "init": {
                  "elements": [
                    1, 2, 3
                  ]
                }
              }
            ]
          }
        ]
      },
      "state": {
        "detectedGlobals": ${JSON.stringify(detectedGlobals)},
        "wrappedModules": [],
        "nextModuleIndex": 0
      }
    }`,
    'main.js': ''
  });
  const config: BundleOptions = {
    entryPoint: './main.js',
    debug: true
  };
  const outputFunction = (error: Error|null) => {
    if (error) {
      t.fail(error.message);
      t.end();
    }
  };
  const bundleFunction = (state: State, paeckchenAst: ESTree.Program, context: PaeckchenContext) => {
    t.truthy(paeckchenAst);
    t.deepEqual(state.modules as any, [1, 2, 3]);
    t.deepEqual(state.detectedGlobals, detectedGlobals);
    t.deepEqual(state.wrappedModules, {});
    t.is(state.getAndIncrementModuleIndex(), 0);

    t.end();
  };

  bundle(config, host, outputFunction, bundleFunction);
});

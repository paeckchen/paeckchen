import test from 'ava';
import * as ESTree from 'estree';
import { join } from 'path';

import { DefaultHost } from '../src/host';
import { State } from '../src/state';
import { errorLogger, HostMock, virtualModule } from './helper';

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
      callme(): void {
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
    BUFFER: `
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
      callme(): void {
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
      callback(): void {
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
  const context: any = {
    logger: {
      trace(): void { /* */ }
    }
  };
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

test.cb('rebundleFactory should throw on error', t => {
  const state = new State([]);
  const ast: any = {};
  const context: any = {};
  const outputFunction = (error: Error) => {
    t.regex(error.message, /Cannot read property 'trace' of undefined/);
    t.end();
  };
  const rebundle = rebundleFactory(state, ast, context, () => undefined, outputFunction);
  rebundle();
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
  const paths = (list: string[]) => list.map(entry => entry.replace(/\\/g, '/'));

  const config: BundleOptions = {
    entryPoint: './dist/test/fixtures/main.js',
    sourceMap: true
  };

  bundle(config, new DefaultHost(), (error, context, code, _sourceMap) => {
    if (error) {
      t.fail(error.message);
      return t.end();
    }
    const sourceMap = JSON.parse(_sourceMap as string);

    t.not(code, undefined);
    t.deepEqual(paths(sourceMap.sources), ['test/fixtures/main.ts']);
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

test.cb('bundle should write state to cache if debug enabled', t => {
  const host = new HostMock({
    'main.js': ''
  });
  const config: BundleOptions = {
    entryPoint: './main.js',
    debug: true
  };
  const outputFunction = (error: Error|null) => {
    if (error) {
      t.fail(error.message);
    }
    setTimeout(() => {
      t.true(join(host.cwd(), 'paeckchen.cache.json') in host.files);
      t.end();
    }, 0);
  };

  bundle(config, host, outputFunction);
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

test.cb('bundle should throw if error during setup', t => {
  const host = new HostMock({
    'main.js': ''
  });
  const config: BundleOptions = {
    entryPoint: './main.js',
    debug: true,
    watchMode: true
  };
  const outputFunction = (error: Error|null) => {
    if (error) {
      t.regex(error.message, /Failure/);
    } else {
      t.fail('expected error');
    }
    t.end();
  };
  const bundleFunction = (state: State, paeckchenAst: ESTree.Program, context: PaeckchenContext) => undefined;

  bundle(config, host, outputFunction, bundleFunction, () => {
    throw new Error('Failure');
  });
});

test.cb('bundle should add all files from cache to watcher if enabled', t => {
  const host = new HostMock({
    'main.js': '',
    'paeckchen.cache.json': `{
      "paeckchenAst": {
        "body": [
          {},
          {},
          {
            "declarations": [
              {
                "init": {
                  "elements": []
                }
              }
            ]
          }
        ]
      },
      "state": {
        "wrappedModules": [
          {
            "index": 0,
            "name": "main.js"
          }
        ]
      }
    }`
  });
  const config: BundleOptions = {
    entryPoint: './main.js',
    debug: true,
    watchMode: true
  };
  const outputFunction = (error: Error) => {
    t.fail('Unexpected error ' + error.message);
    t.end();
  };
  const bundleFunction = (state: State, paeckchenAst: ESTree.Program, context: PaeckchenContext) => {
    t.true('main.js' in (context.watcher as any).files);
    t.end();
  };

  bundle(config, host, outputFunction, bundleFunction);
});

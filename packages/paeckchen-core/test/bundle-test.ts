import test from 'ava';
import { errorLogger, HostMock, virtualModule } from './helper';
import { State } from '../src/state';
import { DefaultHost } from '../src/host';

import { bundle, rebundleFactory, IPaeckchenContext, IBundleOptions } from '../src/bundle';

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

  bundle(options, host, code => {
      let called = false;
      virtualModule(code, {
        callme: function(): void {
          called = true;
        }
      });
      t.true(called);
      t.end();
    })
    .catch(e => {
      t.fail(e.message);
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
  const config: IBundleOptions = {
    entryPoint: '/entry-point.js',
    alias: 'buffer=/BUFFER'
  };

  bundle(config, host, code => {
      let called = false;
      virtualModule(code, {
        callme: function(): void {
          called = true;
        }
      });
      t.true(called);
      t.end();
    })
    .catch(e => {
      t.fail(e.message);
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

  bundle({}, host, code => {
      let called = false;
      virtualModule(code, {
        callback: function(): void {
          called = true;
        }
      });
      t.true(called);
      t.end();
    })
    .catch(e => {
      t.fail(e.message);
      t.end();
    });
});

test('bundle should throw if no entry-point configured', t => {
  const host = new HostMock({
    '/paeckchen.json': '{}'
  }, '/');

  return bundle({}, host, () => undefined)
    .then(() => t.fail('Expected error'))
    .catch(e => {
      t.is(e.message, 'Missing entry-point');
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

  return bundle(config, host, () => undefined, bundleFunction, rebundleFactoryFunction)
    .then(() => {
      t.is(bundleFunctionCalled, 1);
    });
});

test.cb('bundle with source maps should add mappings via sorcery', t => {
  const config: IBundleOptions = {
    entryPoint: './fixtures/main.js',
    sourceMap: true
  };

  bundle(config, new DefaultHost(), (code: string, _sourceMap: string) => {
      const sourceMap = JSON.parse(_sourceMap);

      t.not(code, undefined);
      t.deepEqual(sourceMap.sources, ['../../test/fixtures/main.ts']);
      t.truthy((sourceMap.sourcesContent[0] as string).match(/: string/));
      t.end();
    })
    .catch(e => {
      t.fail(e.message);
      t.end();
    });
});

test.cb('bundle should log on chunk error', t => {
  let errorLogged = false;

  const host = new HostMock({
    '/entry': 'function(){}'
  }, '/');
  const config: IBundleOptions = {
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

  bundle(config, host, () => undefined)
    .catch(e => {
      t.fail(e.message);
      t.end();
    });
});

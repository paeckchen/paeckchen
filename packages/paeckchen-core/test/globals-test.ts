import test from 'ava';
import { runInNewContext } from 'vm';

import { NoopLogger } from '../src/logger';
import { State } from '../src/state';
import { parse, generate, HostMock } from './helper';

import { checkGlobalIdentifier, injectGlobals } from '../src/globals';

test('checkGlobalIdentifier should return true if the global process is refered to', async t => {
  const ast = await parse('process.env.TEST = true;');

  t.true(checkGlobalIdentifier('process', ast));
});

test('checkGlobalIdentifier should return false if the process is declared in scope', async t => {
  const ast = await parse(`
    function a() {
      var process;
      process = {};
    }
  `);

  t.false(checkGlobalIdentifier('process', ast));
});

test('injectGlobals should define global if not already in scope', async t => {
  const state = new State([]);
  state.detectedGlobals.buffer = true;
  state.detectedGlobals.global = true;
  state.detectedGlobals.process = true;
  const host = new HostMock({});

  const ast = await parse(`
    var cache = [];
    function req() {}
    var modules = [
      function() {
        global.check = true;
        process.env.TEST = true;
        bufferCheck = Buffer.isBuffer;
      }
    ];
    modules[0]();
  `);
  const context = {
    config: {
      aliases: {},
      externals: {}
    } as any,
    host,
    logger: new NoopLogger()
  };
  await injectGlobals(state, ast, context);
  const code = await generate(ast);

  const sandbox: any = {
    console,
    __paeckchen_require__(idx: number): any {
      if (idx === 0) {
        // process
        return {
          exports: {
            env: {}
          }
        };
      } else if (idx === 1) {
        // buffer
        return {
          exports: {
            Buffer: {
              isBuffer(): void { /*noop*/ }
            }
          }
        };
      }
    }
  };
  runInNewContext(code, sandbox);
  t.true(sandbox.global.check);
  t.true(sandbox.process.env.TEST);
  t.is(typeof sandbox.bufferCheck, 'function');
});

test('injectGlobals should do nothing if process or Buffer was detected but is not required anymore', async t => {
  const state = new State([]);
  state.detectedGlobals.process = true;
  state.detectedGlobals.buffer = true;
  const host = new HostMock({});
  const ast = await parse(`
    var cache = [];
    function req() {}
    var modules = [
      function() {
      }
    ];
    var process = {};
    var Buffer = {};
    modules[0]();
  `);
  const context = {
    config: {
      aliases: {}
    } as any,
    host,
    logger: new NoopLogger()
  };
  await injectGlobals(state, ast, context);
  const code = await generate(ast);

  t.regex(code, /var process = {};/);
  t.regex(code, /var Buffer = {};/);
});

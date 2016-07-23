import test from 'ava';
import { runInNewContext } from 'vm';
import { parse, generate, HostMock } from './helper';
import { State } from '../src/state';
import { NoopLogger } from '../src/logger';

import { checkGlobalIdentifier, injectGlobals } from '../src/globals';

test('checkGlobalIdentifier should return true if the global process is refered to', t => {
  const ast = parse(`
    process.env.TEST = true;
  `);
  t.true(checkGlobalIdentifier('process', ast));
});

test('checkGlobalIdentifier should return false if the process is declared in scope', t => {
  const ast = parse(`
    function a() {
      var process;
      process = {};
    }
  `);
  t.false(checkGlobalIdentifier('process', ast));
});

test('injectGlobals should define global if not already in scope', t => {
  const state = new State([]);
  state.detectedGlobals.buffer = true;
  state.detectedGlobals.global = true;
  state.detectedGlobals.process = true;
  const host = new HostMock({});
  const ast = parse(`
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
      aliases: {}
    } as any,
    host,
    logger: new NoopLogger()
  };

  injectGlobals(state, ast, context);

  const sandbox: any = {
    console,
    __paeckchen_require__: function(idx: number): any {
      if (idx === 0) {
        // process
        return {
          exports: {
            env: {}
          }
        };
      } else if (idx === 1) {
        // Buffer
        return {
          exports: {
            Buffer: {
              isBuffer: function(): void { /*noop*/ }
            }
          }
        };
      }
    }
  };
  runInNewContext(generate(ast), sandbox);
  t.true(sandbox.global.check);
  t.true(sandbox.process.env.TEST);
  t.is(typeof sandbox.bufferCheck, 'function');
});

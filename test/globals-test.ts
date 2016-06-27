import test from 'ava';
import { runInNewContext } from 'vm';
import { parse, generate } from './helper';

import { checkProcess, injectGlobals } from '../src/globals';

test('checkProcess should return true if the global process is refered to', t => {
  const ast = parse(`
    process.env.TEST = true;
  `);
  t.true(checkProcess(ast));
});

test('checkProcess should return false if the process is declared in scope', t => {
  const ast = parse(`
    function a() {
      var process;
      process = {};
    }
  `);
  t.false(checkProcess(ast));
});

test('injectGlobals should define process if in detectedGlobals', t => {
  const ast = parse(`
    process.env.TEST = true;
  `);

  injectGlobals({
    process: true
  }, ast);

  const sandbox: any = {};
  runInNewContext(generate(ast), sandbox);
  t.true(sandbox.process.env.TEST);
});

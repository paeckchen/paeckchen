import test from 'ava';
import { runInNewContext } from 'vm';
import { parse, generate } from './helper';

import { checkGlobalIdentifier, injectProcess, injectGlobal } from '../src/globals';

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

test('injectGlobal should define global if not already in scope', t => {
  const ast = parse(`
    global.check = true;
  `);

  injectGlobal(ast);

  const sandbox: any = {};
  runInNewContext(generate(ast), sandbox);
  t.true(sandbox.global.check);
});

test('injectProcess should define process if not already in scope', t => {
  const ast = parse(`
    process.env.TEST = true;
  `);

  injectProcess(ast);

  const sandbox: any = {};
  runInNewContext(generate(ast), sandbox);
  t.true(sandbox.process.env.TEST);
});

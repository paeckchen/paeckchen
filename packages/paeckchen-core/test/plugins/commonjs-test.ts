import test from 'ava';
import { stripIndent } from 'common-tags';

import { NoopLogger } from '../../src/logger';
import { State } from '../../src/state';
import { HostMock, parse, generate } from '../helper';

import { rewriteRequireStatements } from '../../src/plugins/commonjs';

test('commonjs should rewrite require statements', async t => {
  const state = new State([]);
  const input = stripIndent`
    var a = require('./dependency');
  `;
  const host = new HostMock({
    'dependency.js': ''
  });
  const context = {
    config: {
      aliases: {},
      externals: {}
    } as any,
    host,
    logger: new NoopLogger()
  };
  const expected = stripIndent`
    var a = __paeckchen_require__(0).exports;
  `;

  const ast = await parse(input);
  await rewriteRequireStatements(ast, 'name', context, state);
  const actual = await generate(ast);

  t.is(actual, expected);
});

test('commonjs should rewrite require statements which are nested inside call chains', async t => {
  const state = new State([]);
  const input = stripIndent`
    require('./dependency')();
  `;
  const host = new HostMock({
    'dependency.js': ''
  });
  const context = {
    config: {
      aliases: {},
      externals: {}
    } as any,
    host,
    logger: new NoopLogger()
  };

  const expected = stripIndent`
    __paeckchen_require__(0).exports();
  `;

  const ast = await parse(input);
  await rewriteRequireStatements(ast, 'name', context, state);
  const actual = await generate(ast);

  t.is(actual, expected);
});

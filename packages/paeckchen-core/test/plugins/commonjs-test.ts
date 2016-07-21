import test from 'ava';
import { stripIndent } from 'common-tags';
import { HostMock, parseAndProcess } from '../helper';
import { State } from '../../src/state';
import { NoopLogger } from '../../src/logger';

import { rewriteRequireStatements } from '../../src/plugins/commonjs';

test('commonjs should rewrite require statements', t => {
  const state = new State([]);

  const input = stripIndent`
    var a = require('./dependency');
  `;
  const expected = stripIndent`
    var a = __paeckchen_require__(0).exports;
  `;

  const host = new HostMock({
    'dependency.js': ''
  });

  const actual = parseAndProcess(input,
    ast => rewriteRequireStatements(ast, 'name', {
      config: {
        aliases: {}
      } as any,
      host,
      logger: new NoopLogger()
    }, state));

  t.is(actual, expected);
});

test('commonjs should rewrite require statements which are nested inside call chains', t => {
  const state = new State([]);
  const input = stripIndent`
    require('./dependency')();
  `;
  const expected = stripIndent`
    __paeckchen_require__(0).exports();
  `;

  const host = new HostMock({
    'dependency.js': ''
  });

  const actual = parseAndProcess(input,
    ast => rewriteRequireStatements(ast, 'name', {
      config: {
        aliases: {}
      } as any,
      host,
      logger: new NoopLogger()
    }, state));

  t.is(actual, expected);
});

import test from 'ava';
import { stripIndent } from 'common-tags';
import { HostMock, parseAndProcess } from '../helper';

import { reset } from '../../src/modules';
import { rewriteRequireStatements } from '../../src/plugins/commonjs';

test.beforeEach(() => {
  reset();
});

test('commonjs should rewrite require statements', t => {
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
      host
    }));

  t.is(actual, expected);
});

test('commonjs should rewrite require statements which are nested inside call chains', t => {
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
      host
    }));

  t.is(actual, expected);
});

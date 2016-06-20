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
    var a = modules[0]().exports;
  `;

  const host = new HostMock({
    'dependency.js': ''
  });
  t.deepEqual(parseAndProcess(input,
    ast => rewriteRequireStatements(ast, 'name', [], host)), expected);
});

import { assert } from 'chai';
import { stripIndent } from 'common-tags';
import { HostMock, parseAndProcess } from '../helper';

import { reset } from '../../src/modules';
import { rewriteRequireStatements } from '../../src/plugins/commonjs';

describe('commonjs', () => {
  beforeEach(() => {
    reset();
  });

  it('should rewrite require statements', () => {
    const input = stripIndent`
      var a = require('./dependency');
    `;
    const expected = stripIndent`
      var a = modules[0]().exports;
    `;

    const host = new HostMock({
      'dependency.js': ''
    });
    assert.equal(parseAndProcess(input,
      ast => rewriteRequireStatements(ast, 'name', [], host)), expected);
  });
});

import test from 'ava';
import { stripIndent } from 'common-tags';
import { HostMock, virtualModule, virtualModuleResult, parseAndProcess } from '../helper';

import { reset } from '../../src/modules';
import { rewriteImportDeclaration } from '../../src/plugins/es6-import';

function rewriteImports(input: string, files: any = {}): string {
  const host = new HostMock(files);

  return parseAndProcess(input, ast => {
    return rewriteImportDeclaration(ast, 'name', [], host);
  });
}

function executeImports(input: string, files: any = {}, settings: any = {}): virtualModuleResult {
  const processed = rewriteImports(input, files);
  return virtualModule(processed, settings);
}

test.beforeEach(reset);

test('es6-import plugin should rewrite import specifiers correctly', t => {
  const input = stripIndent`
    import {foo} from './bar';
    import {bar as baz} from './bar';
    import {baz as foobar, foobar as baz} from './bar';
    module.exports = {
      foo: foo,
      foobar: foobar,
      baz: baz
    };
  `;

  const exported = {
    exports: {
      foo: 'foo',
      baz: 'baz',
      foobar: 'foobar'
    }
  };

  const expected = {
    foo: 'foo',
    baz: 'foobar',
    foobar: 'baz'
  };

  const actual = executeImports(input, {
    './bar.js': ''
  }, {
    modules: [() => exported]
  });

  t.deepEqual(actual, expected);
});

test('es6-import plugin should rewrite default import specifiers correctly', t => {
  const input = stripIndent`
    import foo from './bar';
    module.exports = foo;
  `;

  const exported = {
    exports: {
      default: {
        foo: 'foo'
      }
    }
  };

  const expected = exported.exports.default;

  const actual = executeImports(input, {
    './bar.js': ''
  }, {
    modules: [() => exported]
  });

  t.deepEqual(actual, expected);
});

test('es6-import plugin should rewrite namespace import specifiers correctly', t => {
  const input = stripIndent`
    import * as foo from './bar';
    module.exports = foo;
  `;

  const exported = {
    exports: {
      foo: 'foo',
      bar: 'bar'
    }
  };

  const expected = exported.exports;

  const actual = executeImports(input, {
    './bar.js': ''
  }, {
    modules: [() => exported]
  });

  t.deepEqual(actual, expected);
});

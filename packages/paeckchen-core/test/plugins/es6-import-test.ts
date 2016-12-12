import test from 'ava';
import { stripIndent } from 'common-tags';

import { NoopLogger } from '../../src/logger';
import { State } from '../../src/state';
import { HostMock, virtualModule, virtualModuleResult, parse, generate } from '../helper';

import { rewriteImportDeclaration } from '../../src/plugins/es6-import';

function rewriteImports(input: string, files: any = {}): Promise<string> {
  const state = new State([]);
  const host = new HostMock(files);
  const context = {
    config: {
      aliases: {},
      externals: {}
    } as any,
    host,
    logger: new NoopLogger()
  };

  return parse(input)
    .then(ast =>
      rewriteImportDeclaration(ast, 'name', context, state).then(() =>
        generate(ast)));
}

function executeImports(input: string, files: any = {}, settings: any = {},
    requireResults: any[] = []): Promise<virtualModuleResult> {
  return rewriteImports(input, files).then(processed =>
    virtualModule(processed, settings, requireResults));
}

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
  const files = {
    './bar.js': ''
  };

  const expected = {
    foo: 'foo',
    baz: 'foobar',
    foobar: 'baz'
  };

  return executeImports(input, files, {}, [exported])
    .then(actual => {
      t.deepEqual(actual, expected);
    });
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
  const files = {
    './bar.js': ''
  };

  const expected = exported.exports.default;

  return executeImports(input, files, {}, [exported])
    .then(actual => {
      t.deepEqual(actual, expected);
    });
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
  const files = {
    './bar.js': ''
  };

  const expected = exported.exports;

  return executeImports(input, files, {}, [exported])
    .then(actual => {
      t.deepEqual(actual, expected);
    });
});

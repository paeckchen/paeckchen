import test from 'ava';
import { stripIndent } from 'common-tags';

import { NoopLogger } from '../../src/logger';
import { State } from '../../src/state';
import { HostMock, virtualModule, virtualModuleResult, parse, generate } from '../helper';

import { rewriteImportDeclaration } from '../../src/plugins/es6-import';

async function rewriteImports(input: string, files: any = {}): Promise<string> {
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

  const ast = await parse(input);
  await rewriteImportDeclaration(ast, 'name', context, state);
  return generate(ast);
}

async function executeImports(input: string, files: any = {}, settings: any = {},
    requireResults: any[] = []): Promise<virtualModuleResult> {
  const processed = await rewriteImports(input, files);
  return virtualModule(processed, settings, requireResults);
}

test('es6-import plugin should rewrite import specifiers correctly', async t => {
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

  const actual = await executeImports(input, files, {}, [exported]);

  t.deepEqual(actual, expected);
});

test('es6-import plugin should rewrite default import specifiers correctly', async t => {
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

  const actual = await executeImports(input, files, {}, [exported]);

  t.deepEqual(actual, expected);
});

test('es6-import plugin should rewrite namespace import specifiers correctly', async t => {
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

  const actual = await executeImports(input, files, {}, [exported]);

  t.deepEqual(actual, expected);
});

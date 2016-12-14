import test from 'ava';
import { stripIndent } from 'common-tags';

import { NoopLogger } from '../../src/logger';
import { State } from '../../src/state';
import { HostMock, virtualModule, virtualModuleResult, parse, generate } from '../helper';

import { rewriteExportNamedDeclaration } from '../../src/plugins/es6-export';

async function rewriteExports(input: string, files: any = {}): Promise<string> {
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
  await rewriteExportNamedDeclaration(ast, 'name', context, state);
  return generate(ast);
}

async function executeExports(input: string, files: any = {}, settings: any = {},
    requireResults: any[] = []): Promise<virtualModuleResult> {
  const processed = await rewriteExports(input, files);
  return virtualModule(processed, settings, requireResults);
}

test('es6-export plugin should rewrite variable assignment exports correctly', async t => {
  const input = stripIndent`
    export const foo = 'bar';
    export const bar = 'foo';
  `;

  const expected = {
    foo: 'bar',
    bar: 'foo'
  };

  const actual = await executeExports(input);

  t.deepEqual(actual, expected);
});

test('es6-export plugin should rewrite default exports correctly', async t => {
  const input = stripIndent`
    const bar = 'bar';
    export default bar;
  `;

  const expected = {
    default: 'bar'
  };

  const actual = await executeExports(input);

  t.deepEqual(actual, expected);
});

test('es6-export plugin should rewrite anonymous function default export correctly', async t => {
  const input = stripIndent`
    export default function () {}
  `;

  const actual = await executeExports(input);

  t.truthy(typeof actual['default'] === 'function');
});

test('es6-export plugin should rewrite class default export correctly', async t => {
  const input = `
    'use strict';
    export default class Foo {}
  `;

  const actual = await executeExports(input);

  t.truthy(typeof actual['default'] === 'function');
});

test('es6-export plugin should rewrite named function default export correctly', async t => {
  const input = stripIndent`
    export default function foo () {}
  `;

  const actual = await executeExports(input);

  t.truthy(typeof actual['default'] === 'function');
});

test('es6-export plugin should rewrite named exports correctly', async t => {
  const input = stripIndent`
    const foo = 'foo';
    export {foo as bar};
  `;

  const expected = {
    bar: 'foo'
  };

  const actual = await executeExports(input);

  t.deepEqual(actual, expected);
});

test('es6-export plugin should rewrite named reexports correctly', async t => {
  const input = stripIndent`
    export {foo as bar} from './dependency';
  `;
  const exported = {
    exports: {
      foo: 'bar'
    }
  };
  const files = {
    'dependency.js': ''
  };

  const expected = {
    bar: 'bar'
  };

  const actual = await executeExports(input, files, {}, [exported]);

  t.deepEqual(actual, expected);
});

test('es6-export plugin should rewrite export-all declarations correctly', async t => {
  const input = stripIndent`
    export * from './dependency';
  `;
  const files = {
    'dependency.js': ''
  };

  const expected = {
    exports: {
      foo: 'bar',
      bar: 'foo'
    }
  };

  const actual = await executeExports(input, files, {}, [expected]);

  t.deepEqual(actual, expected.exports);
});

test('es6-export plugin should rewrite exported function declarations correctly', async t => {
  const input = stripIndent`
    export function exported() {};
  `;

  const actual = await executeExports(input);

  t.truthy(typeof actual['exported'] === 'function');
});

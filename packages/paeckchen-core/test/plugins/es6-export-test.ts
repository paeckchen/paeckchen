import test from 'ava';
import { stripIndent } from 'common-tags';

import { NoopLogger } from '../../src/logger';
import { State } from '../../src/state';
import { HostMock, virtualModule, virtualModuleResult, parse, generate } from '../helper';

import { rewriteExportNamedDeclaration } from '../../src/plugins/es6-export';

function rewriteExports(input: string, files: any = {}): Promise<string> {
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
      rewriteExportNamedDeclaration(ast, 'name', context, state).then(() =>
        generate(ast)));
}

function executeExports(input: string, files: any = {}, settings: any = {},
    requireResults: any[] = []): Promise<virtualModuleResult> {
  return rewriteExports(input, files).then(processed =>
    virtualModule(processed, settings, requireResults));
}

test('es6-export plugin should rewrite variable assignment exports correctly', t => {
  const input = stripIndent`
    export const foo = 'bar';
    export const bar = 'foo';
  `;

  const expected = {
    foo: 'bar',
    bar: 'foo'
  };

  return executeExports(input)
    .then(actual => {
      t.deepEqual(actual, expected);
    });
});

test('es6-export plugin should rewrite default exports correctly', t => {
  const input = stripIndent`
    const bar = 'bar';
    export default bar;
  `;

  const expected = {
    default: 'bar'
  };

  return executeExports(input)
    .then(actual => {
      t.deepEqual(actual, expected);
    });
});

test('es6-export plugin should rewrite anonymous function default export correctly', t => {
  const input = stripIndent`
    export default function () {}
  `;

  return executeExports(input)
    .then(actual => {
      t.truthy(typeof actual['default'] === 'function');
    });
});

test('es6-export plugin should rewrite class default export correctly', t => {
  const input = `
    'use strict';
    export default class Foo {}
  `;

  return executeExports(input)
    .then(actual => {
      t.truthy(typeof actual['default'] === 'function');
    });
});

test('es6-export plugin should rewrite named function default export correctly', t => {
  const input = stripIndent`
    export default function foo () {}
  `;

  return executeExports(input)
    .then(actual => {
      t.truthy(typeof actual['default'] === 'function');
    });
});

test('es6-export plugin should rewrite named exports correctly', t => {
  const input = stripIndent`
    const foo = 'foo';
    export {foo as bar};
  `;

  const expected = {
    bar: 'foo'
  };

  return executeExports(input)
    .then(actual => {
      t.deepEqual(actual, expected);
    });
});

test('es6-export plugin should rewrite named reexports correctly', t => {
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

  return executeExports(input, files, {}, [exported])
    .then(actual => {
      t.deepEqual(actual, expected);
    });
});

test('es6-export plugin should rewrite export-all declarations correctly', t => {
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

  return executeExports(input, files, {}, [expected])
    .then(actual => {
      t.deepEqual(actual, expected.exports);
    });
});

test('es6-export plugin should rewrite exported function declarations correctly', t => {
  const input = stripIndent`
    export function exported() {};
  `;

  return executeExports(input)
    .then(actual => {
      t.truthy(typeof actual['exported'] === 'function');
    });
});

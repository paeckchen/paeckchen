import * as path from 'path';
import test from 'ava';

import { HostMock } from './helper';
import { getModulePath } from '../src/module-path';
import { SourceSpec } from '../src/config';

test('getModulePath should throw on non existing module', t => {
  const host = new HostMock({});
  t.throws(() => getModulePath('some/where', './else', { config: {} as any, host }));
});

test('getModulePath should resolve an existing relative file', t => {
  const host = new HostMock({
    'some/else': ''
  });
  t.is(getModulePath('some/where', './else', { config: {} as any, host }), path.resolve(process.cwd(), 'some/else'));
});

test('getModulePath should resolve a relative file while adding .js', t => {
  const host = new HostMock({
    'some/else.js': ''
  });
  t.is(getModulePath('some/where', './else', { config: {} as any, host }), path.resolve(process.cwd(), 'some/else.js'));
});

test('getModulePath should resolve a relative directory with package.json and main', t => {
  const host = new HostMock({
    'some/dir/package.json': '{"main": "./main.js"}',
    'some/dir/main.js': ''
  });
  t.is(getModulePath('some/where', './dir', { config: {} as any, host }), path.resolve(process.cwd(),
    'some/dir/main.js'));
});

test('getModulePath should resolve browser field correctly', t => {
  const host = new HostMock({
    'some/dir/package.json': '{"browser": "./browser.js"}',
    'some/dir/main.js': '',
    'some/dir/browser.js': ''
  });
  t.is(getModulePath('some/where', './dir', { config: {} as any, host }), path.resolve(process.cwd(),
    'some/dir/browser.js'));
});

test('getModulePath should resolve jsnext:main field correctly', t => {
  const host = new HostMock({
    'some/dir/package.json': '{"jsnext:main": "./jsnext.js"}',
    'some/dir/jsnext.js': '',
    'some/dir/main.js': ''
  });
  t.is(getModulePath('some/where', './dir', { config: {} as any, host }), path.resolve(process.cwd(),
    'some/dir/jsnext.js'));
});

test('getModulePath should not resolve jsnext:main field if source-config is set to es5', t => {
  const host = new HostMock({
    'some/dir/package.json': '{"jsnext:main": "./jsnext.js", "main": "./main.js"}',
    'some/dir/jsnext.js': '',
    'some/dir/main.js': ''
  });
  t.is(getModulePath('some/where', './dir', { config: { source: SourceSpec.ES5 } as any, host }),
    path.resolve(process.cwd(), 'some/dir/main.js'));
});

test('getModulePath should resolve browser, jsnext:main and main in correct precedence', t => {
  const host = new HostMock({
    'some/dir/package.json': '{"browser": "./browser", "jsnext:main": "./jsnext.js", "main": "./main.js"}',
    'some/dir/browser.js': '',
    'some/dir/jsnext.js': '',
    'some/dir/main.js': ''
  });
  t.is(getModulePath('some/where', './dir', { config: {} as any, host }), path.resolve(process.cwd(),
    'some/dir/browser.js'));
});

test('getModulePath should resolve a relative directory without package.json but index.js', t => {
  const host = new HostMock({
    'some/dir/index.js': ''
  });
  t.deepEqual(getModulePath('some/where', './dir', { config: {} as any, host }), path.resolve(process.cwd(),
    'some/dir/index.js'));
});

test('getModulePath should resolve from node_modules', t => {
  const host = new HostMock({
    'dir/node_modules/mod/index.js': ''
  });
  t.deepEqual(getModulePath('dir/some/where', 'mod', { config: {} as any, host }), path.resolve(process.cwd(),
    'dir/node_modules/mod/index.js'));
});

test('getModulePath should return the core-modules name where no shim is available', t => {
  const host = new HostMock({});
  t.is(getModulePath('/some/module.js', 'fs', { config: {} as any, host }), 'fs');
});

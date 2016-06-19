import test from 'ava';

import { HostMock } from './helper';
import { getModulePath } from '../src/module-path';

test('getModulePath should throw no non existing module', t => {
  const host = new HostMock({});
  t.throws(() => getModulePath('some/where', './else', host));
});

test('getModulePath should resolve an existing relative file', t => {
  const host = new HostMock({
    'some/else': ''
  });
  t.deepEqual(getModulePath('some/where', './else', host), 'some/else');
});

test('getModulePath should resolve a relative file while adding .js', t => {
  const host = new HostMock({
    'some/else.js': ''
  });
  t.deepEqual(getModulePath('some/where', './else', host), 'some/else.js');
});

test('getModulePath should resolve a relative directory with package.json and main', t => {
  const host = new HostMock({
    'some/dir/package.json': '{"main": "./main.js"}',
    'some/dir/main.js': ''
  });
  t.deepEqual(getModulePath('some/where', './dir', host), 'some/dir/main.js');
});

test('getModulePath should resolve a relative directory without package.json but index.js', t => {
  const host = new HostMock({
    'some/dir/index.js': ''
  });
  t.deepEqual(getModulePath('some/where', './dir', host), 'some/dir/index.js');
});

test('getModulePath should resolve from node_modules', t => {
  const host = new HostMock({
    'dir/node_modules/mod/index.js': ''
  });
  t.deepEqual(getModulePath('dir/some/where', 'mod', host), 'dir/node_modules/mod/index.js');
});

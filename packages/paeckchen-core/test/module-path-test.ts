import * as path from 'path';
import test from 'ava';
import { SourceSpec } from '../src/config';
import { NoopLogger } from '../src/logger';
import { HostMock } from './helper';

import { getModulePath } from '../src/module-path';

test('getModulePath should throw on non existing module', t => {
  const host = new HostMock({});
  const context = {
    config: {} as any,
    host,
    logger: new NoopLogger()
  };
  t.throws(() => getModulePath('some/where', './else', context));
});

test('getModulePath should resolve an existing relative file', t => {
  const host = new HostMock({
    'some/else': ''
  });
  const context = {
    config: {
      aliases: {}
    } as any,
    host,
    logger: new NoopLogger()
  };
  t.is(getModulePath('some/where', './else', context),
    path.resolve(process.cwd(), 'some/else'));
});

test('getModulePath should resolve a relative file while adding .js', t => {
  const host = new HostMock({
    'some/else.js': ''
  });
  const context = {
    config: {
      aliases: {}
    } as any,
    host,
    logger: new NoopLogger()
  };
  t.is(getModulePath('some/where', './else', context),
    path.resolve(process.cwd(), 'some/else.js'));
});

test('getModulePath should resolve a relative directory with package.json and main', t => {
  const host = new HostMock({
    'some/dir/package.json': '{"main": "./main.js"}',
    'some/dir/main.js': ''
  });
  const context = {
    config: {
      input: {},
      aliases: {}
    } as any,
    host,
    logger: new NoopLogger()
  };
  t.is(getModulePath('some/where', './dir', context),
    path.resolve(process.cwd(), 'some/dir/main.js'));
});

test('getModulePath should resolve browser field correctly', t => {
  const host = new HostMock({
    'some/dir/package.json': '{"browser": "./browser.js"}',
    'some/dir/main.js': '',
    'some/dir/browser.js': ''
  });
  const context = {
    config: {
      input: {},
      aliases: {}
    } as any,
    host,
    logger: new NoopLogger()
  };
  t.is(getModulePath('some/where', './dir', context), path.resolve(process.cwd(),
    'some/dir/browser.js'));
});

test('getModulePath should resolve jsnext:main field correctly', t => {
  const host = new HostMock({
    'some/dir/package.json': '{"jsnext:main": "./jsnext.js"}',
    'some/dir/jsnext.js': '',
    'some/dir/main.js': ''
  });
  const context = {
    config: {
      input: {},
      aliases: {}
    } as any,
    host,
    logger: new NoopLogger()
  };
  t.is(getModulePath('some/where', './dir', context),
    path.resolve(process.cwd(), 'some/dir/jsnext.js'));
});

test('getModulePath should not resolve jsnext:main field if source-config is set to es5', t => {
  const host = new HostMock({
    'some/dir/package.json': '{"jsnext:main": "./jsnext.js", "main": "./main.js"}',
    'some/dir/jsnext.js': '',
    'some/dir/main.js': ''
  });
  const context = {
    config: {
      input: {
        source: SourceSpec.ES5
      },
      aliases: {}
    } as any,
    host,
    logger: new NoopLogger()
  };
  t.is(getModulePath('some/where', './dir', context), path.resolve(process.cwd(), 'some/dir/main.js'));
});

test('getModulePath should resolve browser, jsnext:main and main in correct precedence', t => {
  const host = new HostMock({
    'some/dir/package.json': '{"browser": "./browser", "jsnext:main": "./jsnext.js", "main": "./main.js"}',
    'some/dir/browser.js': '',
    'some/dir/jsnext.js': '',
    'some/dir/main.js': ''
  });
  const context = {
    config: {
      input: {
      },
      aliases: {}
    } as any,
    host,
    logger: new NoopLogger()
  };
  t.is(getModulePath('some/where', './dir', context), path.resolve(process.cwd(), 'some/dir/browser.js'));
});

test('getModulePath should resolve a relative directory without package.json but index.js', t => {
  const host = new HostMock({
    'some/dir/index.js': ''
  });
  const context = {
    config: {
      input: {
      },
      aliases: {}
    } as any,
    host,
    logger: new NoopLogger()
  };
  t.deepEqual(getModulePath('some/where', './dir', context),
    path.resolve(process.cwd(), 'some/dir/index.js'));
});

test('getModulePath should resolve from node_modules', t => {
  const host = new HostMock({
    'dir/node_modules/mod/index.js': ''
  });
  const context = {
    config: {
      input: {
      },
      aliases: {}
    } as any,
    host,
    logger: new NoopLogger()
  };
  t.deepEqual(getModulePath('dir/some/where', 'mod', context),
    path.resolve(process.cwd(), 'dir/node_modules/mod/index.js'));
});

test('getModulePath should return the core-modules name where no shim is available', t => {
  const host = new HostMock({});
  const context = {
    config: {
      input: {
      },
      aliases: {}
    } as any,
    host,
    logger: new NoopLogger()
  };
  t.is(getModulePath('/some/module.js', 'fs', context), 'fs');
});

test('getModulePath should use the alias name if possible', t => {
  const host = new HostMock({
    '/alias.js': ''
  });
  const context = {
    config: {
      input: {
      },
      aliases: {
        'alias-module': '/alias.js'
      }
    } as any,
    host,
    logger: new NoopLogger()
  };
  t.is(getModulePath('/some/module.js', 'alias-module', context), path.resolve('/alias.js'));
});

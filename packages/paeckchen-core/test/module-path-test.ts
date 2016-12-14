import test from 'ava';
import * as path from 'path';

import { SourceSpec } from '../src/config';
import { NoopLogger } from '../src/logger';
import { HostMock } from './helper';

import { getModulePath } from '../src/module-path';

test('getModulePath should throw on non existing module', async t => {
  const host = new HostMock({});
  const context = {
    config: {} as any,
    host,
    logger: new NoopLogger()
  };
  try {
    await getModulePath('some/where', './else', context);
    t.fail('Expected to throw');
  } catch (e) {
    t.truthy(e);
  }
});

test('getModulePath should resolve an existing relative file', async t => {
  const host = new HostMock({
    'some/else': ''
  });
  const context = {
    config: {
      aliases: {},
      externals: {}
    } as any,
    host,
    logger: new NoopLogger()
  };
  const resolved = await getModulePath('some/where', './else', context);

  t.is(resolved, path.resolve(process.cwd(), 'some/else'));
});

test('getModulePath should resolve a relative file while adding .js', async t => {
  const host = new HostMock({
    'some/else.js': ''
  });
  const context = {
    config: {
      aliases: {},
      externals: {}
    } as any,
    host,
    logger: new NoopLogger()
  };
  const resolved = await getModulePath('some/where', './else', context);

  t.is(resolved, path.resolve(process.cwd(), 'some/else.js'));
});

test('getModulePath should resolve a relative directory with package.json and main', async t => {
  const host = new HostMock({
    'some/dir/package.json': '{"main": "./main.js"}',
    'some/dir/main.js': ''
  });
  const context = {
    config: {
      input: {},
      aliases: {},
      externals: {}
    } as any,
    host,
    logger: new NoopLogger()
  };
  const resolved = await getModulePath('some/where', './dir', context);

  t.is(resolved, path.resolve(process.cwd(), 'some/dir/main.js'));
});

test('getModulePath should resolve browser field correctly', async t => {
  const host = new HostMock({
    'some/dir/package.json': '{"browser": "./browser.js"}',
    'some/dir/main.js': '',
    'some/dir/browser.js': ''
  });
  const context = {
    config: {
      input: {},
      aliases: {},
      externals: {}
    } as any,
    host,
    logger: new NoopLogger()
  };
  const resolved = await getModulePath('some/where', './dir', context);

  t.is(resolved, path.resolve(process.cwd(), 'some/dir/browser.js'));
});

test('getModulePath should resolve jsnext:main field correctly', async t => {
  const host = new HostMock({
    'some/dir/package.json': '{"jsnext:main": "./jsnext.js"}',
    'some/dir/jsnext.js': '',
    'some/dir/main.js': ''
  });
  const context = {
    config: {
      input: {},
      aliases: {},
      externals: {}
    } as any,
    host,
    logger: new NoopLogger()
  };
  const resolved = await getModulePath('some/where', './dir', context);

  t.is(resolved, path.resolve(process.cwd(), 'some/dir/jsnext.js'));
});

test('getModulePath should not resolve jsnext:main field if source-config is set to es5', async t => {
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
      aliases: {},
      externals: {}
    } as any,
    host,
    logger: new NoopLogger()
  };
  const resolved = await getModulePath('some/where', './dir', context);

  t.is(resolved, path.resolve(process.cwd(), 'some/dir/main.js'));
});

test('getModulePath should resolve browser, jsnext:main and main in correct precedence', async t => {
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
      aliases: {},
      externals: {}
    } as any,
    host,
    logger: new NoopLogger()
  };
  const resolved = await getModulePath('some/where', './dir', context);

  t.is(resolved, path.resolve(process.cwd(), 'some/dir/browser.js'));
});

test('getModulePath should resolve a relative directory without package.json but index.js', async t => {
  const host = new HostMock({
    'some/dir/index.js': ''
  });
  const context = {
    config: {
      input: {
      },
      aliases: {},
      externals: {}
    } as any,
    host,
    logger: new NoopLogger()
  };
  const resolved = await getModulePath('some/where', './dir', context);

  t.deepEqual(resolved, path.resolve(process.cwd(), 'some/dir/index.js'));
});

test('getModulePath should resolve from node_modules', async t => {
  const host = new HostMock({
    'dir/node_modules/mod/index.js': ''
  });
  const context = {
    config: {
      input: {
      },
      aliases: {},
      externals: {}
    } as any,
    host,
    logger: new NoopLogger()
  };
  const resolved = await getModulePath('dir/some/where', 'mod', context);

  t.deepEqual(resolved, path.resolve(process.cwd(), 'dir/node_modules/mod/index.js'));
});

test('getModulePath should return the core-modules name where no shim is available', async t => {
  const host = new HostMock({});
  const context = {
    config: {
      input: {
      },
      aliases: {},
      externals: {}
    } as any,
    host,
    logger: new NoopLogger()
  };
  const resolved = await getModulePath('/some/module.js', 'fs', context);

  t.is(resolved, 'fs');
});

test('getModulePath should use the alias name if possible', async t => {
  const host = new HostMock({
    '/alias.js': ''
  });
  const context = {
    config: {
      input: {
      },
      aliases: {
        'alias-module': '/alias.js'
      },
      externals: {}
    } as any,
    host,
    logger: new NoopLogger()
  };
  const resolved = await getModulePath('/some/module.js', 'alias-module', context);

  t.is(resolved, path.resolve('/alias.js'));
});

test('getModulePath should keep external module names as is', async t => {
  const host = new HostMock({});
  const context = {
    config: {
      input: {
      },
      externals: {
        jQuery: '$'
      }
    } as any,
    host,
    logger: new NoopLogger()
  };
  const resolved = await getModulePath('/some/module.js', 'jQuery', context);

  t.is(resolved, 'jQuery');
});

test('getModulePath should throw if an error occurs during file reading', async t => {
  const host = new HostMock({}, '/');
  const origFileExists = host.fileExists;
  host.fileExists = name => {
    if (name === '/some/package.json') {
      return true;
    }
    return origFileExists(name);
  };
  const origIsFile = host.isFile;
  host.isFile = name => {
    if (name === '/some/package.json') {
      return Promise.resolve(true);
    }
    return origIsFile(name);
  };
  const context = {
    config: {
      aliases: {},
      externals: {}
    } as any,
    host,
    logger: new NoopLogger()
  };
  try {
    await getModulePath('/some/where', './else', context);
    t.fail('Expected to throw');
  } catch (e) {
    t.truthy(e);
  }
});

test('getModulePath should throw if file existance check throws', async t => {
  const host = new HostMock({}, '/');
  const origFileExists = host.fileExists;
  host.fileExists = name => {
    if (name === '/some/package.json') {
      throw new Error('failed');
    }
    return origFileExists(name);
  };
  const origIsFile = host.isFile;
  host.isFile = name => {
    if (name === '/some/package.json') {
      return Promise.resolve(true);
    }
    return origIsFile(name);
  };
  const context = {
    config: {
      aliases: {},
      externals: {}
    } as any,
    host,
    logger: new NoopLogger()
  };
  try {
    await getModulePath('/some/where', './else', context);
    t.fail('Expected to throw');
  } catch (e) {
    t.regex(e.message, /Cannot find module/);
  }
});

test('getModulePath should throw if file check throws', async t => {
  const host = new HostMock({}, '/');
  const origFileExists = host.fileExists;
  host.fileExists = name => {
    if (name === '/some/package.json') {
      return true;
    }
    return origFileExists(name);
  };
  const origIsFile = host.isFile;
  host.isFile = name => {
    if (name === '/some/package.json') {
      return Promise.reject(new Error('failed'));
    }
    return origIsFile(name);
  };
  const context = {
    config: {
      aliases: {},
      externals: {}
    } as any,
    host,
    logger: new NoopLogger()
  };
  try {
    await getModulePath('/some/where', './else', context);
    t.fail('Expected to throw');
  } catch (e) {
    t.regex(e.message, /Cannot find module/);
  }
});

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
  return getModulePath('some/where', './else', context)
    .then(() => {
      t.fail('Expected to throw');
    })
    .catch(e => {
      t.truthy(e);
    });
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
  return getModulePath('some/where', './else', context)
    .then(resolved => {
      t.is(resolved, path.resolve(process.cwd(), 'some/else'));
    });
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
  return getModulePath('some/where', './else', context)
    .then(resolved => {
      t.is(resolved, path.resolve(process.cwd(), 'some/else.js'));
    });
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
  return getModulePath('some/where', './dir', context)
    .then(resolved => {
      t.is(resolved, path.resolve(process.cwd(), 'some/dir/main.js'));
    });
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
  return getModulePath('some/where', './dir', context)
    .then(resolved => {
      t.is(resolved, path.resolve(process.cwd(), 'some/dir/browser.js'));
    });
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
  return getModulePath('some/where', './dir', context)
    .then(resolved => {
      t.is(resolved, path.resolve(process.cwd(), 'some/dir/jsnext.js'));
    });
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
  return getModulePath('some/where', './dir', context)
    .then(resolved => {
      t.is(resolved, path.resolve(process.cwd(), 'some/dir/main.js'));
    });
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
  return getModulePath('some/where', './dir', context)
    .then(resolved => {
      t.is(resolved, path.resolve(process.cwd(), 'some/dir/browser.js'));
    });
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
  return getModulePath('some/where', './dir', context)
    .then(resolved => {
      t.deepEqual(resolved, path.resolve(process.cwd(), 'some/dir/index.js'));
    });
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
  return getModulePath('dir/some/where', 'mod', context)
    .then(resolved => {
      t.deepEqual(resolved, path.resolve(process.cwd(), 'dir/node_modules/mod/index.js'));
    });
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
  return getModulePath('/some/module.js', 'fs', context)
    .then(resolved => {
      t.is(resolved, 'fs');
    });
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
  return getModulePath('/some/module.js', 'alias-module', context)
    .then(resolved => {
      t.is(resolved, path.resolve('/alias.js'));
    });
});

test('getModulePath should throw if an error occurs during file reading', t => {
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
      aliases: {}
    } as any,
    host,
    logger: new NoopLogger()
  };
  return getModulePath('/some/where', './else', context)
    .then(() => {
      t.fail('Expected to throw');
    })
    .catch(e => {
      t.truthy(e);
    });
});

test('getModulePath should throw if file existance check throws', t => {
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
      aliases: {}
    } as any,
    host,
    logger: new NoopLogger()
  };
  return getModulePath('/some/where', './else', context)
    .then(() => {
      t.fail('Expected to throw');
    })
    .catch(e => {
      t.truthy(e.message.match(/Cannot find module/));
    });
});

test('getModulePath should throw if file check throws', t => {
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
      aliases: {}
    } as any,
    host,
    logger: new NoopLogger()
  };
  return getModulePath('/some/where', './else', context)
    .then(() => {
      t.fail('Expected to throw');
    })
    .catch(e => {
      t.truthy(e.message.match(/Cannot find module/));
    });
});

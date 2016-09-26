import test, { ContextualTestContext } from 'ava';
import { resolve } from 'path';
import { writeFile, readFileSync, existsSync, unlinkSync, unlink } from 'fs';
import { FSWatcher } from '../src/watcher';

import { DefaultHost } from '../src/host';

test.beforeEach((t: ContextualTestContext) => {
  t.context.host = new DefaultHost();
});

test('DefaultHost#cwd should return the current directory', t => {
  t.is((t.context.host as DefaultHost).cwd(), process.cwd());
});

test('DefaultHost#fileExists should return true for existing file', t => {
  t.true((t.context.host as DefaultHost).fileExists('../../package.json'));
});

test('DefaultHost#fileExists should return false for non-existing file', t => {
  t.false((t.context.host as DefaultHost).fileExists('./package.json'));
});

test('DefaultHost#isFile should return true for file', t => {
  return (t.context.host as DefaultHost).isFile('../../package.json')
    .then(result => {
      t.true(result);
    });
});

test('DefaultHost#isFile should return false for directory', t => {
  return (t.context.host as DefaultHost).isFile('../../node_modules')
    .then(result => {
      t.false(result);
    });
});

test('DefaultHost#isFile should fail for non existing file', t => {
  return (t.context.host as DefaultHost).isFile('../../package.jsno')
    .then(result => {
      t.fail('Exception expected');
    })
    .catch(e => {
      t.truthy(e.message.match(/no such file/));
    });
});

test('DefaultHost#readFile should return the file content', t => {
  const path = '../../package.json';
  return (t.context.host as DefaultHost).readFile(path)
    .then(data => {
      t.deepEqual(data, readFileSync(path).toString());
    });
});

test('DefaultHost#readFile should fail for non existing file', t => {
  const path = '../../package.jsno';
  return (t.context.host as DefaultHost).readFile(path)
    .then(data => {
      t.fail('Exception expected');
    })
    .catch(e => {
      t.truthy(e.message.match(/no such file/));
    });
});

test('DefaultHost#writeFile should dump the content to disk', t => {
  const file = resolve(process.cwd(), 'create-me/dump.txt');
  try {
    (t.context.host as DefaultHost).writeFile(file, 'test-data');
    t.is(readFileSync(file).toString(), 'test-data');
  } finally {
    if (existsSync(file)) {
      unlinkSync(file);
    }
  }
});

test.cb('DefaultHost#getModificationTime should return the mtime of the given file', t => {
  function write(file: string, content: string, cb: () => void): void {
    writeFile(file, content, err => {
      if (err) {
        t.fail('failed to write to file');
        console.error(err);
        t.end();
      } else {
        cb();
      }
    });
  }
  function unlinkFile(file: string): void {
    unlink(file, () => {
      t.end();
    });
  };

  const file = resolve(process.cwd(), 'mtime-test.txt');
  write(file, '0', () => {
    (t.context.host as DefaultHost).getModificationTime(file)
      .then(mtime1 => {
        setTimeout(() => {
          write(file, '1', () => {
            (t.context.host as DefaultHost).getModificationTime(file)
              .then(mtime2 => {
                unlinkFile(file);
                t.true(mtime2 > mtime1);
                t.end();
              })
              .catch(err => {
                t.fail('Failed to get mtime1');
                unlinkFile(file);
              });
          });
        }, 10);
      })
      .catch(err => {
        t.fail('Failed to get mtime1');
        unlinkFile(file);
      });
  });
});

test('DefaultHost#getModificationTime should return -1 if file does not exist', t => {
  return (t.context.host as DefaultHost).getModificationTime('does-not-exist')
    .then(mtime => {
      t.is(mtime, -1);
    });
});

test('DefaultHost#createWatcher should return a new watcher instance', t => {
  const watcher = (t.context.host as DefaultHost).createWatcher();
  t.true(watcher instanceof FSWatcher);
});

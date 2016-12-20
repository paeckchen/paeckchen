import test from 'ava';
import { File } from 'gulp-util';

import { VinylWatcher } from '../src/watcher';

import { GulpHost } from '../src/host';

test('GulpHost should return previously added files', t => {
  const host = new GulpHost('/');
  const file = new File({
    path: '/test'
  });

  host.addFile(file);
  t.is(host.getFile(file.path), file);
});

test('GulpHost should store files written with it', t => {
  const host = new GulpHost('/');

  host.writeFile('/test', 'content');
  t.is((host.getFile('/test') as File).path, '/test');
  t.is((host.getFile('/test') as File).contents!.toString(), 'content');
});

test.cb('GulpHost should add new watched files to the watcher', t => {
  const host = new GulpHost('.');
  const watcher = host.createWatcher();
  watcher.start((event, fileName) => {
    t.is(event, 'add');
    t.is(fileName, 'added.js');
    t.end();
  });
  watcher.watchFile('added.js');

  const file = new File({
    path: 'added.js'
  });

  host.addFile(file);
  (watcher as VinylWatcher).emitEvents();
});

test.cb('GulpHost should update existing watched files', t => {
  const host = new GulpHost('.');
  const watcher = host.createWatcher();
  let secondEmit = false;
  watcher.start((event, fileName) => {
    if (secondEmit) {
      t.is(event, 'update');
      t.is(fileName, 'updated.js');
      t.end();
    }
    secondEmit = true;
  });
  watcher.watchFile('updated.js');

  const file = new File({
    path: 'updated.js'
  });
  host.addFile(file);
  (watcher as VinylWatcher).emitEvents();

  host.addFile(file);
  (watcher as VinylWatcher).emitEvents();
});

test.cb('GulpHost should update only newer files', t => {
  const host = new GulpHost('.');
  const watcher = host.createWatcher();
  let oneUpdate = false;
  let twoUpdate = false;
  watcher.start((event, fileName) => {
    if (fileName === 'one.js') {
      if (oneUpdate) {
        t.fail('one.js should not be updated');
      }
      oneUpdate = true;
    }
    if (fileName === 'two.js') {
      if (twoUpdate) {
        t.is(event, 'update');
        t.is(fileName, 'two.js');
        t.end();
      }
      twoUpdate = true;
    }
  });
  watcher.watchFile('one.js');
  watcher.watchFile('two.js');

  const file = new File({
    path: 'one.js',
    stat: {
      mtime: new Date()
    } as any
  });
  const file2 = new File({
    path: 'two.js',
    stat: {
      mtime: new Date()
    } as any
  });

  host.addFile(file);
  host.addFile(file2);
  (watcher as VinylWatcher).emitEvents();

  const file3 = new File({
    path: 'two.js',
    stat: {
      mtime: new Date(file2.stat!.mtime.getTime() + 100)
    } as any
  });
  host.addFile(file);
  host.addFile(file3);
  (watcher as VinylWatcher).emitEvents();
});

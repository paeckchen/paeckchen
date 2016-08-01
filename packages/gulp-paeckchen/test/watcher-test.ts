import test from 'ava';

import { VinylWatcher } from '../src/watcher';

test('GulpWatcher should emit add events for new watched files', t => {
  const watcher = new VinylWatcher();
  watcher.watchFile('test');
  watcher.addFile('test');
  t.is((watcher as any).events['test'], 'add');
});

test('GulpWatcher should not emit add events for not watched files', t => {
  const watcher = new VinylWatcher();
  watcher.addFile('test');
  t.is(Object.keys((watcher as any).events).length, 0);
});

test('GulpWatcher should emit update events for watched files', t => {
  const watcher = new VinylWatcher();
  watcher.watchFile('test');
  watcher.updateFile('test');
  t.is((watcher as any).events['test'], 'update');
});

test('GulpWatcher should not emit update events for not watched files', t => {
  const watcher = new VinylWatcher();
  watcher.updateFile('test');
  t.is(Object.keys((watcher as any).events).length, 0);
});

test('GulpWatcher should remove unwatch files from watch-list', t => {
  const watcher = new VinylWatcher();
  watcher.watchFile('test');
  t.truthy((watcher as any).watchedFiles['test']);

  watcher.unwatchFile('test');
  t.falsy((watcher as any).watchedFiles['test']);
});

import test from 'ava';
import { FSWatcher } from 'chokidar';
import { HostMock } from './helper';

import { Watcher } from '../src/watcher';

class ChokidarMock extends FSWatcher {
  public onCalls: string[] = [];
  private onAdd: Function;
  private onChange: Function;
  private onUnlink: Function;
  public addCalls: string[] = [];
  public unwatchCalls: string[] = [];

  public on(name: string, fn: Function): ChokidarMock {
    this.onCalls.push(name);
    if (name === 'add') {
      this.onAdd = fn;
    } else if (name === 'change') {
      this.onChange = fn;
    } else if (name === 'unlink') {
      this.onUnlink = fn;
    }
    return this;
  }

  public emit(event: string, fileName: string): void {
    if (event === 'add') {
      this.onAdd(fileName);
    } else if (event === 'change') {
      this.onChange(fileName);
    } else if (event === 'unlink') {
      this.onUnlink(fileName);
    }
  }

  public add(dir: string): ChokidarMock {
    this.addCalls.push(dir);
    return this;
  }

  public unwatch(dir: string): ChokidarMock {
    this.unwatchCalls.push(dir);
    return this;
  }
}

test('Watcher should register callbacks on the watcher if enabled', t => {
  const host = new HostMock({});
  const chokidar = new ChokidarMock();
  const onUpdate = (event: string, fileName: string): void => undefined;

  const watcher = new Watcher(host, chokidar);
  watcher.start(onUpdate);

  t.deepEqual(chokidar.onCalls, ['add', 'change', 'unlink']);
});

test('Watcher should ignore changes of new files not on the watch list', t => {
  let updateFileName: string;

  const host = new HostMock({});
  const chokidar = new ChokidarMock();
  const onUpdate = (event: string, fileName: string): void => {
    updateFileName = fileName;
  };

  const watcher = new Watcher(host, chokidar);
  watcher.start(onUpdate);
  chokidar.emit('add', 'new-file');

  t.is(updateFileName, undefined);
});

test('Watcher should ignore changes of existing files not on the watch list', t => {
  let updateFileName: string;

  const host = new HostMock({});
  const chokidar = new ChokidarMock();
  const onUpdate = (event: string, fileName: string): void => {
    updateFileName = fileName;
  };

  const watcher = new Watcher(host, chokidar);
  watcher.start(onUpdate);
  chokidar.emit('change', 'changed-file');

  t.is(updateFileName, undefined);
});

test('Watcher should ignore removals of existing files not on the watch list', t => {
  let updateFileName: string;

  const host = new HostMock({});
  const chokidar = new ChokidarMock();
  const onUpdate = (event: string, fileName: string): void => {
    updateFileName = fileName;
  };

  const watcher = new Watcher(host, chokidar);
  watcher.start(onUpdate);
  chokidar.emit('unlink', 'removed-file');

  t.is(updateFileName, undefined);
});

test('Watcher should register folders with new files to the watcher', t => {
  let updateFileName: string;

  const host = new HostMock({});
  const chokidar = new ChokidarMock();
  const onUpdate = (event: string, fileName: string): void => {
    updateFileName = fileName;
  };

  const watcher = new Watcher(host, chokidar);
  watcher.start(onUpdate);
  watcher.watchFile('dir/new-file');

  t.deepEqual(chokidar.addCalls, ['dir']);
});

test('Watcher should remove folders from the watcher if no watched files left', t => {
  let updateFileName: string;

  const host = new HostMock({});
  const chokidar = new ChokidarMock();
  const onUpdate = (event: string, fileName: string): void => {
    updateFileName = fileName;
  };

  const watcher = new Watcher(host, chokidar);
  watcher.start(onUpdate);
  watcher.unwatchFile('dir/file');

  t.deepEqual(chokidar.unwatchCalls, ['dir']);
});

test('Watcher should keep watching folders if watched files left', t => {
  let updateFileName: string;

  const host = new HostMock({});
  const chokidar = new ChokidarMock();
  const onUpdate = (event: string, fileName: string): void => {
    updateFileName = fileName;
  };

  const watcher = new Watcher(host, chokidar);
  watcher.start(onUpdate);
  watcher.watchFile('dir/file1');
  watcher.watchFile('dir/file2');
  chokidar.emit('unlink', 'dir/file1');

  t.deepEqual(chokidar.unwatchCalls, []);
});

test.skip('Watcher should notify if watched file changes', t => {
  t.plan(2);

  const host = new HostMock({});
  const chokidar = new ChokidarMock();
  const onUpdate = (event: string, fileName: string): void => {
    t.is(event, 'change');
    t.is(fileName, 'dir/file');
    t.end();
  };

  const watcher = new Watcher(host, chokidar);
  watcher.start(onUpdate);
  watcher.watchFile('dir/file');
  chokidar.emit('update', 'dir/file');
});

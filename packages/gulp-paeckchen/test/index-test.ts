import test from 'ava';
import * as gulp from 'gulp';
import { File, PluginError } from 'gulp-util';
import { Logger } from 'paeckchen-core';
import { Transform } from 'stream';
import * as through from 'through2';

import { paeckchen } from '../src/index';

class TestLogger implements Logger {
  public configure(): void { /* */ }
  public trace(): void { /* */ }
  public debug(): void { /* */ }
  public info(): void { /* */ }
  public error(): void { /* */ }
  public progress(): void { /* */ }
}

test.cb('paeckchen-gulp throws in error during bundling', t => {
  gulp.src('fixtures/*.js')
    .pipe(paeckchen({entryPoint: 'not-found.js', exitOnError: false, logger: new TestLogger()})())
    .on('data', (data: File) => {
      t.fail(`Expected error`);
    })
    .on('error', (err: PluginError) => {
      t.regex(err.message, /Cannot find module/);
    })
    .on('end', () => {
      t.end();
    });
});

test.cb('paeckchen-gulp will stop on error by default', t => {
  const origProcessExit = process.exit;
  function resetProcess(): void {
    process.exit = origProcessExit;
  }
  process.exit = function(code): void {
    resetProcess();
    t.is(code, 1);
    t.end();
  };

  gulp.src('fixtures/*.js')
    .pipe(paeckchen({entryPoint: 'not-found.js', logger: new TestLogger()})())
    .on('data', (data: File) => {
      t.fail(`Expected error`);
      t.end();
    });
});

test.cb('paeckchen-gulp will emit host updates in watch mode', t => {
  function touchFile(this: Transform, file: File, _: any, callback: () => void): void {
    file.stat.mtime.setTime(file.stat.mtime.getTime() + 1);
    this.push(file);
    callback();
  }

  const bundler = paeckchen({entryPoint: 'test.js', logger: new TestLogger()});
  gulp.src('fixtures/*.js')
    .pipe(bundler())
    .on('data', (data: File) => {
      t.is(data.basename, 'test.js');

      // simulate watch update
      gulp.src('fixtures/*.js')
        .pipe(through.obj(touchFile))
        .pipe(bundler())
        .on('data', (dataUpdate: File) => {
          t.is(dataUpdate.basename, 'test.js');
          t.deepEqual(data.contents.toString(), dataUpdate.contents.toString());
          t.end();
        })
        .on('error', (err: PluginError) => {
          t.fail(`Unexpected error ${err}`);
          t.end();
        });
    })
    .on('error', (err: PluginError) => {
      t.fail(`Unexpected error ${err}`);
      t.end();
    });
});

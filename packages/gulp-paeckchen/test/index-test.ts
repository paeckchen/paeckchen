import test from 'ava';
import { runInNewContext } from 'vm';
import * as gulp from 'gulp';
import { File, PluginError } from 'gulp-util';
import { Logger } from 'paeckchen-core';

import { paeckchen } from '../src/index';

class TestLogger implements Logger {
  public configure(): void { /* */ }
  public trace(): void { /* */ }
  public debug(): void { /* */ }
  public info(): void { /* */ }
  public error(): void { /* */ }
  public progress(): void { /* */ }
}

test.cb('paeckchen-gulp should let through null files', t => {
  const bundler = paeckchen('entry-point');
  const stream = bundler();
  stream
    .on('data', () => {
      // noop
    })
    .on('end', () => {
      t.end();
    })
    .on('error', (err: PluginError) => {
      t.fail(`Unexpected error: ${err}`);
      t.end();
    });

  stream.write(new File() as any);
  stream.end();
});

test.cb('paeckchen-gulp should throw error on stream input', t => {
  gulp.src('fixtures/test.js', { buffer: false })
    .pipe(paeckchen()())
    .on('data', () => {
      // noop
    })
    .on('end', () => {
      t.fail('Expected error');
      t.end();
    })
    .on('error', (err: PluginError) => {
      t.regex(err.message, /Streaming not supported/);
      t.end();
    });
});

test.cb('paeckchen-gulp bundles on end of stream', t => {
  let msg: string;

  gulp.src('fixtures/*.js')
    .pipe(paeckchen({entryPoint: 'fixtures/test.js', logger: new TestLogger()})())
    .on('data', (data: File) => {
      const code = data.contents.toString();
      runInNewContext(code, {
        console: {
          log: function(_msg: string): void {
            msg = _msg;
          }
        }
      });
    })
    .on('end', () => {
      t.is(msg, 'Hello World!');
      t.end();
    })
    .on('error', (err: PluginError) => {
      t.fail(`Unexpected error: ${err}`);
      t.end();
    });
});

test.cb('paeckchen-gulp throws in error during bundling', t => {
  gulp.src('fixtures/*.js')
    .pipe(paeckchen({entryPoint: 'fixtures/not-found.js', exitOnError: false, logger: new TestLogger()})())
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
    .pipe(paeckchen({entryPoint: 'fixtures/not-found.js', logger: new TestLogger()})())
    .on('data', (data: File) => {
      t.fail(`Expected error`);
      t.end();
    });
});

test.cb('paeckchen-gulp will emit host updates in watch mode', t => {
  const bundler = paeckchen({entryPoint: 'fixtures/test.js', logger: new TestLogger()});

  gulp.src('fixtures/*.js')
    .pipe(bundler())
    .on('data', (data: File) => {
      t.is(data.basename, 'test.js');

      // Simulate watch update
      gulp.src('fixtures/*.js')
        .pipe(bundler())
        .on('data', (dataUpdate: File) => {
          t.is(dataUpdate.basename, 'test.js');
          t.deepEqual(data.contents.toString(), dataUpdate.contents.toString());
          t.end();
        });
    });
});

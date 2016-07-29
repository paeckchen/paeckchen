import test from 'ava';
import { runInNewContext } from 'vm';
import * as gulp from 'gulp';
import { File, PluginError } from 'gulp-util';

import { paeckchen } from '../src/index';

test.cb('paeckchen-gulp should let through null files', t => {
  const stream = paeckchen();
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
    .pipe(paeckchen())
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
    .pipe(paeckchen({entryPoint: 'fixtures/test.js'}))
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
    .pipe(paeckchen({entryPoint: 'fixtures/not-found.js', exitOnError: false}))
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

test.cb.skip('paeckchen-gulp will stop on error by default', t => {
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
    .pipe(paeckchen({entryPoint: 'fixtures/not-found.js'}))
    .on('data', (data: File) => {
      t.fail(`Expected error`);
      t.end();
    });
});

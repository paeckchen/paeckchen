import test from 'ava';
import { runInNewContext } from 'vm';
import * as gulp from 'gulp';
import { File, PluginError } from 'gulp-util';

import { paeckchen } from '../src/index';

test.cb('paeckchen-gulp should let through null files', t => {
  const stream = paeckchen('entry-point');
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
    .pipe(paeckchen('entry-point'))
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

  const opts = {};
  gulp.src('fixtures/*.js')
    .pipe(paeckchen('fixtures/test.js', opts))
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

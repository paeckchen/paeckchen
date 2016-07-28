import test from 'ava';
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

test.cb('paeckchen-gulp should add each file input to its host', t => {
  const opts = {
    bundle: () => Promise.resolve()
  } as any;

  gulp.src('fixtures/*.js')
    .pipe(paeckchen('entry-point', opts))
    .on('data', () => {
      // noop
    })
    .on('end', () => {
      t.is(Object.keys(opts.host.files).length, 2);
      t.end();
    })
    .on('error', (err: PluginError) => {
      t.fail(`Unexpected error: ${err}`);
      t.end();
    });
});

test.cb('paeckchen-gulp bundles on end of stream', t => {
  let bundleCalled = 0;
  const opts = {
    bundle: () => {
      bundleCalled++;
      return Promise.resolve();
    }
  };

  gulp.src('fixtures/*.js')
    .pipe(paeckchen('fixtures/test.js', opts))
    .on('data', () => {
      // noop
    })
    .on('end', () => {
      t.is(bundleCalled, 1);
      t.end();
    })
    .on('error', (err: PluginError) => {
      t.fail(`Unexpected error: ${err}`);
      t.end();
    });
});

import test from 'ava';
import { File } from 'gulp-util';
import { bundle } from 'paeckchen-core';
import { ExtendedFile } from '../src/context';

import { flushFactory } from '../src/flush-factory';

test.cb('flushFactory bundles on call', t => {
  let bundleFile: File;

  const opts = {};
  const gulpContext = {
    host: {
      addFile: () => undefined
    } as any,
    firstFlush: true
  } as any;
  const bundleFn: typeof bundle = (bundleOpts, host, outputFn) => {
    const context = {
      config: {
        output: {
          file: 'result.js'
        }
      }
    } as any;
    outputFn(null, context, 'code', undefined);
  };
  const flush = flushFactory(opts, gulpContext, bundleFn);
  const fakeEmitter = {
    push: (file: File) => {
      bundleFile = file;
    }
  };
  flush.call(fakeEmitter, () => {
    t.is(bundleFile.path, 'result.js');
    t.is(bundleFile.contents.toString(), 'code');
    t.end();
  });
});

test.cb('flushFactory rebundles on second call', t => {
  const opts = {};
  const gulpContext = {
    host: {
      emitWatcherEvents: () => {
        t.end();
      }
    } as any,
    firstFlush: false
  } as any;
  const flush = flushFactory(opts, gulpContext);
  flush(() => undefined);
});

test.cb('flushFactory directly continues of no files are present', t => {
  const opts = {};
  const gulpContext = {} as any;
  const flush = flushFactory(opts, gulpContext);
  flush(() => {
    t.end();
  });
});

test.cb('flushFactory handles sourceMaps if given in files', t => {
  let bundleFile: ExtendedFile;

  const opts = {};
  const gulpContext = {
    host: {
      addFile: () => undefined
    } as any,
    firstFlush: true,
    withSourceMap: true
  } as any;
  const bundleFn: typeof bundle = (bundleOpts, host, outputFn) => {
    t.is(bundleOpts.sourceMap, true);
    const context = {
      config: {
        output: {
          file: 'result.js'
        }
      }
    } as any;
    outputFn(null, context, 'code', '{}');
  };
  const flush = flushFactory(opts, gulpContext, bundleFn);
  const fakeEmitter = {
    push: (file: File) => {
      bundleFile = file;
    }
  };
  flush.call(fakeEmitter, () => {
    t.deepEqual(bundleFile.sourceMap, {file: 'result.js'});
    t.end();
  });
});

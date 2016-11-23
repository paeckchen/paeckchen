import * as through from 'through2';

import { GulpContext, GulpOptions } from './context';
import { flushFactory } from './flush-factory';
import { GulpLogger } from './logger';
import { transformFactory } from './transform-factory';

export interface GulpPaeckchen {
  (): NodeJS.ReadWriteStream;
}

export function paeckchen(opts: GulpOptions|string = {}): GulpPaeckchen {
  opts = typeof opts === 'string' ? { entryPoint: opts } : opts;
  opts.exitOnError = typeof opts.exitOnError === 'boolean' ? opts.exitOnError : true;
  opts.watchMode = true;

  const gulpContext: GulpContext = {
    withSourceMap: false,
    firstFile: undefined as any,
    host: undefined as any,
    logger: opts.logger = (opts.logger || new GulpLogger()),
    firstFlush: true,
    stream: undefined as any,
    flushCallback: undefined as any
  };

  return function bundler(): NodeJS.ReadWriteStream {
    return through.obj(transformFactory(gulpContext), flushFactory(opts, gulpContext));
  };
}

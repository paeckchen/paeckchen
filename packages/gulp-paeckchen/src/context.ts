import { Transform } from 'stream';
import { File } from 'gulp-util';
import { GulpHost } from './host';
import { BundleOptions, Logger } from 'paeckchen-core';

export const PLUGIN_NAME = 'gulp-paeckchen';

export interface ExtendedFile extends File {
  sourceMap?: any;
}

export interface GulpOptions extends BundleOptions {
  exitOnError?: boolean;
}

export interface GulpContext {
  host: GulpHost;
  firstFile: File;
  withSourceMap: boolean;
  firstFlush: boolean;
  stream: Transform;
  flushCallback: () => void;
  logger: Logger;
}

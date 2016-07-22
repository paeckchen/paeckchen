import test from 'ava';
import * as debug from 'debug';
import { ProgressStep } from 'paeckchen-core';

import { CliLogger } from '../src/cli-logger';

test.beforeEach('hook stderr', t => {
  t.context.stderrWrite = process.stderr.write;
  t.context.stderrOutput = '';
  process.stderr.write = function(...args: any[]): any {
    if (args[0]) {
      t.context.stderrOutput += args[0].toString();
    }
  };
  debug.enable('test');
});

test.afterEach('restore stderr', t => {
  process.stderr.write = t.context.stderrWrite;
});

test('cli-logger should output error message', t => {
  const logger = new CliLogger();

  logger.error('test', new Error('message'), 'error');

  t.truthy((t.context.stderrOutput as string).match(/error/));
  t.truthy((t.context.stderrOutput as string).match(/message/));
});

test('cli-logger should output info message', t => {
  const logger = new CliLogger();

  logger.info('test', 'info');

  t.truthy((t.context.stderrOutput as string).match(/info/));
});

test('cli-logger should output debug message', t => {
  const logger = new CliLogger();

  logger.debug('test', 'debug');

  t.truthy((t.context.stderrOutput as string).match(/debug/));
});

test('cli-logger should output trace message', t => {
  const logger = new CliLogger();

  logger.trace('test', 'trace');

  t.truthy((t.context.stderrOutput as string).match(/trace/));
});

test('cli-logger should update progress after logging', t => {
  const logger = new CliLogger();

  logger.progress(ProgressStep.bundleModules, 50, 50);
  logger.info('test', 'info');

  t.truthy((t.context.stderrOutput as string).match(/info.*50% \[50|100\]/));
});

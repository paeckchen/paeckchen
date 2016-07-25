import test from 'ava';
import * as debug from 'debug';
import { ProgressStep, LogLevel } from 'paeckchen-core';

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

  t.regex(t.context.stderrOutput, /error/);
  t.regex(t.context.stderrOutput, /message/);
});

test('cli-logger should output info message', t => {
  const logger = new CliLogger();

  logger.info('test', 'info');

  t.regex(t.context.stderrOutput, /info/);
});

test('cli-logger should output debug message', t => {
  const logger = new CliLogger();
  logger.configure({
    logLevel: LogLevel.debug
  } as any);

  logger.debug('test', 'debug');

  t.regex(t.context.stderrOutput, /debug/);
});

test('cli-logger should not output debug message if only default loglevel is set', t => {
  const logger = new CliLogger();
  logger.configure({
    logLevel: LogLevel.default
  } as any);

  logger.debug('test', 'debug');

  t.is(t.context.stderrOutput, '');
});

test('cli-logger should not output debug message if trace loglevel is set', t => {
  const logger = new CliLogger();
  logger.configure({
    logLevel: LogLevel.trace
  } as any);

  logger.debug('test', 'debug');

  t.regex(t.context.stderrOutput, /debug/);
});

test('cli-logger should output trace message', t => {
  const logger = new CliLogger();
  logger.configure({
    logLevel: LogLevel.trace
  } as any);

  logger.trace('test', 'trace');

  t.regex(t.context.stderrOutput, /trace/);
});

test('cli-logger should update progress after logging', t => {
  const logger = new CliLogger();

  logger.progress(ProgressStep.bundleModules, 50, 50);
  logger.info('test', 'info');

  t.regex(t.context.stderrOutput, /info.*50% \[50|100\]/);
});

test('cli-logger should output all progress step names', t => {
  const logger = new CliLogger();

  logger.progress(ProgressStep.init, 50, 50);
  t.regex(t.context.stderrOutput, /initializing/);
  t.context.stderrOutput = '';

  logger.progress(ProgressStep.bundleModules, 50, 50);
  t.regex(t.context.stderrOutput, /bundle modules/);
  t.context.stderrOutput = '';

  logger.progress(ProgressStep.bundleGlobals, 50, 50);
  t.regex(t.context.stderrOutput, /bundle globals/);
  t.context.stderrOutput = '';

  logger.progress(ProgressStep.generateBundle, 50, 50);
  t.regex(t.context.stderrOutput, /create paeckchen/);
  t.context.stderrOutput = '';

  logger.progress(ProgressStep.generateSourceMap, 50, 50);
  t.regex(t.context.stderrOutput, /create source-map/);
  t.context.stderrOutput = '';
});

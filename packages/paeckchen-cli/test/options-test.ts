import test from 'ava';
import { IBundleOptions } from 'paeckchen-core';

import { createOptions } from '../src/options';

test.beforeEach(t => {
  t.context.opts = {
    configFile: undefined,
    entryPoint: undefined,
    source: undefined,
    outputDirectory: undefined,
    outputFile: undefined,
    runtime: undefined,
    alias: undefined,
    external: undefined,
    watchMode: false
  } as IBundleOptions;
});

test('createOptions with no flags should return an empty configuration', t => {
  const options = createOptions([]);
  t.deepEqual(options, t.context.opts);
});

test('createOptions --config', t => {
  t.context.opts.configFile = 'config';
  const options = createOptions(['--config', 'config']);
  t.deepEqual(options, t.context.opts);
});

test('createOptions -c', t => {
  t.context.opts.configFile = 'config';
  const options = createOptions(['-c', 'config']);
  t.deepEqual(options, t.context.opts);
});

test('createOptions --entry', t => {
  t.context.opts.entryPoint = 'entry-point';
  const options = createOptions(['--entry', 'entry-point']);
  t.deepEqual(options, t.context.opts);
});

test('createOptions -e', t => {
  t.context.opts.entryPoint = 'entry-point';
  const options = createOptions(['-e', 'entry-point']);
  t.deepEqual(options, t.context.opts);
});

test('createOptions --source', t => {
  t.context.opts.source = 'source';
  const options = createOptions(['--source', 'source']);
  t.deepEqual(options, t.context.opts);
});

test('createOptions -s', t => {
  t.context.opts.source = 'source';
  const options = createOptions(['-s', 'source']);
  t.deepEqual(options, t.context.opts);
});

test('createOptions --runtime', t => {
  t.context.opts.runtime = 'runtime';
  const options = createOptions(['--runtime', 'runtime']);
  t.deepEqual(options, t.context.opts);
});

test('createOptions -r', t => {
  t.context.opts.runtime = 'runtime';
  const options = createOptions(['-r', 'runtime']);
  t.deepEqual(options, t.context.opts);
});

test('createOptions --out-dir', t => {
  t.context.opts.outputDirectory = 'out-dir';
  const options = createOptions(['--out-dir', 'out-dir']);
  t.deepEqual(options, t.context.opts);
});

test('createOptions -o', t => {
  t.context.opts.outputDirectory = 'out-dir';
  const options = createOptions(['-o', 'out-dir']);
  t.deepEqual(options, t.context.opts);
});

test('createOptions --out-file', t => {
  t.context.opts.outputFile = 'out-file';
  const options = createOptions(['--out-file', 'out-file']);
  t.deepEqual(options, t.context.opts);
});

test('createOptions -f', t => {
  t.context.opts.outputFile = 'out-file';
  const options = createOptions(['-f', 'out-file']);
  t.deepEqual(options, t.context.opts);
});

test('createOptions --alias', t => {
  t.context.opts.alias = 'some=same';
  const options = createOptions(['--alias', 'some=same']);
  t.deepEqual(options, t.context.opts);
});

test('createOptions -a', t => {
  t.context.opts.alias = 'some=same';
  const options = createOptions(['-a', 'some=same']);
  t.deepEqual(options, t.context.opts);
});

test('createOptions --external', t => {
  t.context.opts.external = 'external=global';
  const options = createOptions(['--external', 'external=global']);
  t.deepEqual(options, t.context.opts);
});

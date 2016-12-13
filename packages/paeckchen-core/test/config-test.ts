import test from 'ava';

import { HostMock } from './helper';

import { createConfig, Config, SourceSpec, Runtime, LogLevel } from '../src/config';

test('createConfig should return the config defaults', async t => {
  const host = new HostMock({
    '/paeckchen.json': '{}'
  }, '/');

  const config = await createConfig({}, host);

  t.deepEqual(config, {
    input: {
      entryPoint: undefined,
      source: SourceSpec.ES2015
    },
    output: {
      folder: host.cwd(),
      file: undefined,
      runtime: Runtime.browser,
      sourceMap: false
    },
    aliases: {},
    externals: {},
    watchMode: false,
    logLevel: LogLevel.default,
    debug: false
  } as Config);
});

test('createConfig should prefer entry point of options', async t => {
  const host = new HostMock({
    '/paeckchen.json': '{"input": {"entry": "config"}}'
  }, '/');

  const config = await createConfig({entryPoint: 'options'}, host);

  t.is(config.input.entryPoint, 'options');
});

test('createConfig should fallback to entry point of config', async t => {
  const host = new HostMock({
    '/paeckchen.json': '{"input": {"entry": "config"}}'
  }, '/');

  const config = await createConfig({}, host);

  t.is(config.input.entryPoint, 'config');
});

test('createConfig should prefer sourceMap of options', async t => {
  const host = new HostMock({
    '/paeckchen.json': '{"output": {"sourceMap": false}}'
  }, '/');

  const config = await createConfig({sourceMap: true}, host);

  t.is(config.output.sourceMap, true);
});

test('createConfig should fallback to sourceMap of config', async t => {
  const host = new HostMock({
    '/paeckchen.json': '{"output": {"sourceMap": true}}'
  }, '/');

  const config = await createConfig({}, host);

  t.is(config.output.sourceMap, true);
});

test('createConfig should prefer sourceMap of options (inline)', async t => {
  const host = new HostMock({
    '/paeckchen.json': '{"output": {"sourceMap": true}}'
  }, '/');

  const config = await createConfig({sourceMap: 'inline'}, host);

  t.is(config.output.sourceMap as string, 'inline');
});

test('createConfig should allow sourceMap "true"', async t => {
  const host = new HostMock({
    '/paeckchen.json': '{"output": {"sourceMap": "true"}}'
  }, '/');

  const config = await createConfig({}, host);

  t.is(config.output.sourceMap, true);
});

test('createConfig should allow sourceMap "false"', async t => {
  const host = new HostMock({
    '/paeckchen.json': '{"output": {"sourceMap": "false"}}'
  }, '/');

  const config = await createConfig({}, host);

  t.is(config.output.sourceMap, false);
});

test('createConfig should fail on invalid sourceMap values', async t => {
  const host = new HostMock({
    '/paeckchen.json': '{"output": {"sourceMap": "foo"}}'
  }, '/');

  try {
    await createConfig({}, host);
    t.fail('Expected exception');
  } catch (e) {
    t.regex(e.message, /Invalid sourceMap/);
  }
});

test('createConfig should prefer source level of options', async t => {
  const host = new HostMock({
    '/paeckchen.json': '{"source": "es2015"}'
  }, '/');

  const config = await createConfig({source: 'es5'}, host);

  t.is(config.input.source, SourceSpec.ES5);
});

test('createConfig should throw on invalid source value', async t => {
  const host = new HostMock({
    '/paeckchen.json': '{"input": {"source": "abc"}}'
  }, '/');

  try {
    await createConfig({}, host);
    t.fail('Expected error');
  } catch (e) {
    t.is(e.message, 'Invalid source option abc');
  }
});

test('createConfig should throw on invalid runtime value', async t => {
  const host = new HostMock({
    '/paeckchen.json': '{"output": {"runtime": "abc"}}'
  }, '/');

  try {
    await createConfig({}, host);
    t.fail('Expected error');
  } catch (e) {
    t.is(e.message, 'Invalid runtime abc');
  }
});

test('createConfig should throw on invalid config file', async t => {
  const host = new HostMock({
    '/paeckchen.json': "{'test': value}"
  }, '/');

  try {
    await createConfig({}, host);
    t.fail('Expected error');
  } catch (e) {
    t.truthy(e.message.match(/Failed to read config file/));
  }
});

test('createConfig should prefer output directory option', async t => {
  const host = new HostMock({
    '/paeckchen.json': '{"output": {"folder": "foo"}}'
  }, '/');

  const config = await createConfig({outputDirectory: 'bar'}, host);

  t.is(config.output.folder, 'bar');
});

test('createConfig should prefer output file option', async t => {
  const host = new HostMock({
    '/paeckchen.json': '{"output": {"file": "foo"}}'
  }, '/');

  const config = await createConfig({outputFile: 'bar'}, host);

  t.is(config.output.file, 'bar');
});

test('createConfig should read alias from config file', async t => {
  const host = new HostMock({
    '/paeckchen.json': '{"aliases": {"module": "/some/path"}}'
  }, '/');

  const config = await createConfig({}, host);

  t.deepEqual(config.aliases, {module: '/some/path'} as {[name: string]: string});
});

test('createConfig should join single alias into config', async t => {
  const host = new HostMock({
    '/paeckchen.json': '{"aliases": {"module": "/some/path"}}'
  }, '/');

  const config = await createConfig({alias: 'name=path'}, host);

  const expected: {[name: string]: string} = {
    module: '/some/path',
    name: 'path'
  };
  t.deepEqual(config.aliases, expected);
});

test('createConfig should join multi aliases into config', async t => {
  const host = new HostMock({
    '/paeckchen.json': '{"aliases": {"module": "/some/path"}}'
  }, '/');

  const config = await createConfig({alias: ['name=path', 'name2=path2']}, host);

  const expected: {[name: string]: string} = {
    module: '/some/path',
    name: 'path',
    name2: 'path2'
  };
  t.deepEqual(config.aliases, expected);
});

test('createConfig should create options from aliases', async t => {
  const host = new HostMock({
    '/paeckchen.json': '{}'
  }, '/');

  const config = await createConfig({alias: 'name=path'}, host);

  const expected: {[name: string]: string} = {
    name: 'path'
  };
  t.deepEqual(config.aliases, expected);
});

test('createConfig should read runtime from config file', async t => {
  const host = new HostMock({
    '/paeckchen.json': '{"output": {"runtime": "node"}}'
  }, '/');

  const config = await createConfig({}, host);

  t.deepEqual(config.output.runtime, Runtime.node);
});

test('createConfig should prefer runtime from options', async t => {
  const host = new HostMock({
    '/paeckchen.json': '{"output": {"runtime": "node"}}'
  }, '/');

  const config = await createConfig({runtime: 'browser'}, host);

  t.deepEqual(config.output.runtime, Runtime.browser);
});

test('createConfig should read externals from config file', async t => {
  const host = new HostMock({
    '/paeckchen.json': '{"externals": {"module": "Global"}}'
  }, '/');

  const config = await createConfig({}, host);

  t.deepEqual(config.externals, {module: 'Global'});
});

test('createConfig should convert externals "false" to false', async t => {
  const host = new HostMock({
    '/paeckchen.json': '{"externals": {"module": "false"}}'
  }, '/');

  const config = await createConfig({}, host);

  t.deepEqual(config.externals, {module: false});
});

test('createConfig should join single external into config', async t => {
  const host = new HostMock({
    '/paeckchen.json': '{"externals": {"module": "Global"}}'
  }, '/');

  const config = await createConfig({external: 'name=var'}, host);

  const expected: {[name: string]: string} = {
    module: 'Global',
    name: 'var'
  };
  t.deepEqual(config.externals, expected);
});

test('createConfig should join multi externals into config', async t => {
  const host = new HostMock({
    '/paeckchen.json': '{"externals": {"module": "Global"}}'
  }, '/');

  const config = await createConfig({external: ['name=var', 'name2=var2']}, host);

  const expected: {[name: string]: string} = {
    module: 'Global',
    name: 'var',
    name2: 'var2'
  };
  t.deepEqual(config.externals, expected);
});

test('createConfig should create options from externals', async t => {
  const host = new HostMock({
    '/paeckchen.json': '{}'
  }, '/');

  const config = await createConfig({external: 'name=var'}, host);

  const expected: {[name: string]: string} = {
    name: 'var'
  };
  t.deepEqual(config.externals, expected);
});

test('createConfig should read loglevel from config file', async t => {
  const host = new HostMock({
    '/paeckchen.json': '{"logLevel": "debug"}'
  }, '/');

  const config = await createConfig({}, host);

  t.deepEqual(config.logLevel, LogLevel.debug);
});

test('createConfig should prefer loglevel from options', async t => {
  const host = new HostMock({
    '/paeckchen.json': '{"logLevel": "debug"}'
  }, '/');

  const config = await createConfig({logLevel: 'trace'}, host);

  t.deepEqual(config.logLevel, LogLevel.trace);
});

test('createConfig should fail on invalid loglevel', async t => {
  const host = new HostMock({
    '/paeckchen.json': '{"logLevel": "foo"}'
  }, '/');

  try {
    await createConfig({}, host);
    t.fail('Expected exception');
  } catch (e) {
    t.regex(e.message, /Invalid logLevel/);
  }
});

test('createConfig should read debug from config file', async t => {
  const host = new HostMock({
    '/paeckchen.json': '{"debug": true}'
  }, '/');

  const config = await createConfig({}, host);

  t.true(config.debug);
});

test('createConfig should prefer debug from options', async t => {
  const host = new HostMock({
    '/paeckchen.json': '{"debug": "false"}'
  }, '/');

  const config = await createConfig({debug: true}, host);

  t.true(config.debug);
});

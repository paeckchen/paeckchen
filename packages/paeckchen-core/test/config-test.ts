import test from 'ava';

import { createConfig, IConfig, SourceSpec, Runtime } from '../src/config';
import { HostMock } from './helper';

test('createConfig should return the config defaults', t => {
  const host = new HostMock({
    '/paeckchen.json': '{}'
  }, '/');

  const config = createConfig({}, host);

  t.deepEqual(config, {
    input: {
      entryPoint: undefined,
      source: SourceSpec.ES2015,
    },
    output: {
      folder: host.cwd(),
      file: undefined,
      runtime: Runtime.browser
    },
    aliases: {},
    externals: {},
    watchMode: false
  } as IConfig);
});

test('createConfig should prefer entry point of options', t => {
  const host = new HostMock({
    '/paeckchen.json': '{"input": {"entry": "config"}}'
  }, '/');

  const config = createConfig({entryPoint: 'options'}, host);

  t.is(config.input.entryPoint, 'options');
});

test('createConfig should fallback to entry point of config', t => {
  const host = new HostMock({
    '/paeckchen.json': '{"input": {"entry": "config"}}'
  }, '/');

  const config = createConfig({}, host);

  t.is(config.input.entryPoint, 'config');
});

test('createConfig should prefer source level of options', t => {
  const host = new HostMock({
    '/paeckchen.json': '{"source": "es2015"}'
  }, '/');

  const config = createConfig({source: 'es5'}, host);

  t.is(config.input.source, SourceSpec.ES5);
});

test('createConfig should throw on invalid source value', t => {
  const host = new HostMock({
    '/paeckchen.json': '{"input": {"source": "abc"}}'
  }, '/');

  t.throws(() => createConfig({}, host), 'Invalid source option abc');
});

test('createConfig should throw on invalid runtime value', t => {
  const host = new HostMock({
    '/paeckchen.json': '{"output": {"runtime": "abc"}}'
  }, '/');

  t.throws(() => createConfig({}, host), 'Invalid runtime abc');
});

test('createConfig should throw on invalid config file', t => {
  const host = new HostMock({
    '/paeckchen.json': "{'test': value}"
  }, '/');

  t.throws(() => createConfig({}, host), /Failed to read config file/);
});

test('createConfig should prefer output directory option', t => {
  const host = new HostMock({
    '/paeckchen.json': '{"output": {"folder": "foo"}}'
  }, '/');

  const config = createConfig({outputDirectory: 'bar'}, host);

  t.is(config.output.folder, 'bar');
});

test('createConfig should prefer output file option', t => {
  const host = new HostMock({
    '/paeckchen.json': '{"output": {"file": "foo"}}'
  }, '/');

  const config = createConfig({outputFile: 'bar'}, host);

  t.is(config.output.file, 'bar');
});

test('createConfig should read alias from config file', t => {
  const host = new HostMock({
    '/paeckchen.json': '{"aliases": {"module": "/some/path"}}'
  }, '/');

  const config = createConfig({}, host);

  t.deepEqual(config.aliases, {'module': '/some/path'} as {[name: string]: string});
});

test('createConfig should join single alias into config', t => {
  const host = new HostMock({
    '/paeckchen.json': '{"aliases": {"module": "/some/path"}}'
  }, '/');

  const config = createConfig({alias: 'name=path'}, host);

  const expected: {[name: string]: string} = {
    module: '/some/path',
    name: 'path'
  };
  t.deepEqual(config.aliases, expected);
});

test('createConfig should join multi aliases into config', t => {
  const host = new HostMock({
    '/paeckchen.json': '{"aliases": {"module": "/some/path"}}'
  }, '/');

  const config = createConfig({alias: ['name=path', 'name2=path2']}, host);

  const expected: {[name: string]: string} = {
    module: '/some/path',
    name: 'path',
    name2: 'path2'
  };
  t.deepEqual(config.aliases, expected);
});

test('createConfig should create options from aliases', t => {
  const host = new HostMock({
    '/paeckchen.json': '{}'
  }, '/');

  const config = createConfig({alias: 'name=path'}, host);

  const expected: {[name: string]: string} = {
    name: 'path',
  };
  t.deepEqual(config.aliases, expected);
});

test('createConfig should read runtime from config file', t => {
  const host = new HostMock({
    '/paeckchen.json': '{"output": {"runtime": "node"}}'
  }, '/');

  const config = createConfig({}, host);

  t.deepEqual(config.output.runtime, Runtime.node);
});

test('createConfig should prefer runtime from options', t => {
  const host = new HostMock({
    '/paeckchen.json': '{"output": {"runtime": "node"}}'
  }, '/');

  const config = createConfig({runtime: 'browser'}, host);

  t.deepEqual(config.output.runtime, Runtime.browser);
});

test('createConfig should read externals from config file', t => {
  const host = new HostMock({
    '/paeckchen.json': '{"externals": {"module": "Global"}}'
  }, '/');

  const config = createConfig({}, host);

  t.deepEqual(config.externals, {'module': 'Global'} as {[name: string]: string});
});

test('createConfig should join single external into config', t => {
  const host = new HostMock({
    '/paeckchen.json': '{"externals": {"module": "Global"}}'
  }, '/');

  const config = createConfig({external: 'name=var'}, host);

  const expected: {[name: string]: string} = {
    module: 'Global',
    name: 'var'
  };
  t.deepEqual(config.externals, expected);
});

test('createConfig should join multi externals into config', t => {
  const host = new HostMock({
    '/paeckchen.json': '{"externals": {"module": "Global"}}'
  }, '/');

  const config = createConfig({external: ['name=var', 'name2=var2']}, host);

  const expected: {[name: string]: string} = {
    module: 'Global',
    name: 'var',
    name2: 'var2'
  };
  t.deepEqual(config.externals, expected);
});

test('createConfig should create options from externals', t => {
  const host = new HostMock({
    '/paeckchen.json': '{}'
  }, '/');

  const config = createConfig({external: 'name=var'}, host);

  const expected: {[name: string]: string} = {
    name: 'var',
  };
  t.deepEqual(config.externals, expected);
});

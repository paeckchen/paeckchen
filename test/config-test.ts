import test from 'ava';

import { createConfig, IConfig, SourceSpec } from '../src/config';
import { HostMock } from './helper';

test('createConfig should return the config defaults', t => {
  const host = new HostMock({
    '/paeckchen.json': '{}'
  }, '/');

  const config = createConfig({}, host);

  t.deepEqual(config, {
    entryPoint: undefined,
    source: SourceSpec.ES2015,
    watchMode: false,
    output: undefined
  } as IConfig);
});

test('createConfig should prefer entry point of options', t => {
  const host = new HostMock({
    '/paeckchen.json': '{"entry": "config"}'
  }, '/');

  const config = createConfig({entryPoint: 'options'}, host);

  t.is(config.entryPoint, 'options');
});

test('createConfig should fallback to entry point of config', t => {
  const host = new HostMock({
    '/paeckchen.json': '{"entry": "config"}'
  }, '/');

  const config = createConfig({}, host);

  t.is(config.entryPoint, 'config');
});

test('createConfig should prefer source level of options', t => {
  const host = new HostMock({
    '/paeckchen.json': '{"source": "es2015"}'
  }, '/');

  const config = createConfig({source: 'es5'}, host);

  t.is(config.source, SourceSpec.ES5);
});

test('createConfig should throw on invalid source value', t => {
  const host = new HostMock({
    '/paeckchen.json': '{"source": "abc"}'
  }, '/');

  t.throws(() => {
    createConfig({}, host);
  });
});

test('createConfig should throw on invalid config file', t => {
  const host = new HostMock({
    '/paeckchen.json': "{'test': value}"
  }, '/');

  t.throws(() => {
    createConfig({}, host);
  });
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

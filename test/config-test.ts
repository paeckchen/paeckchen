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
    watchMode: false
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


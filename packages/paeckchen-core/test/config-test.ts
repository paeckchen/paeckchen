import test from 'ava';

import { createConfig, IConfig, SourceSpec, Runtime, LogLevel } from '../src/config';
import { HostMock } from './helper';

test('createConfig should return the config defaults', t => {
  const host = new HostMock({
    '/paeckchen.json': '{}'
  }, '/');

  return createConfig({}, host)
    .then(config => {
      t.deepEqual(config, {
        input: {
          entryPoint: undefined,
          source: SourceSpec.ES2015,
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
        logLevel: LogLevel.default
      } as IConfig);
    });
});

test('createConfig should prefer entry point of options', t => {
  const host = new HostMock({
    '/paeckchen.json': '{"input": {"entry": "config"}}'
  }, '/');

  return createConfig({entryPoint: 'options'}, host)
    .then(config => {
      t.is(config.input.entryPoint, 'options');
    });
});

test('createConfig should fallback to entry point of config', t => {
  const host = new HostMock({
    '/paeckchen.json': '{"input": {"entry": "config"}}'
  }, '/');

  return createConfig({}, host)
    .then(config => {
      t.is(config.input.entryPoint, 'config');
    });
});

test('createConfig should prefer sourceMap of options', t => {
  const host = new HostMock({
    '/paeckchen.json': '{"output": {"sourceMap": false}}'
  }, '/');

  return createConfig({sourceMap: true}, host)
    .then(config => {
      t.true(config.output.sourceMap);
    });
});

test('createConfig should fallback to sourceMap of config', t => {
  const host = new HostMock({
    '/paeckchen.json': '{"output": {"sourceMap": true}}'
  }, '/');

  return createConfig({}, host)
    .then(config => {
      t.true(config.output.sourceMap);
    });
});

test('createConfig should prefer source level of options', t => {
  const host = new HostMock({
    '/paeckchen.json': '{"source": "es2015"}'
  }, '/');

  return createConfig({source: 'es5'}, host)
    .then(config => {
      t.is(config.input.source, SourceSpec.ES5);
    });
});

test('createConfig should throw on invalid source value', t => {
  const host = new HostMock({
    '/paeckchen.json': '{"input": {"source": "abc"}}'
  }, '/');

  return createConfig({}, host)
    .then(() => t.fail('Expected error'))
    .catch(e => {
      t.is(e.message, 'Invalid source option abc');
    });
});

test('createConfig should throw on invalid runtime value', t => {
  const host = new HostMock({
    '/paeckchen.json': '{"output": {"runtime": "abc"}}'
  }, '/');

  return createConfig({}, host)
    .then(() => t.fail('Expected error'))
    .catch(e => {
      t.is(e.message, 'Invalid runtime abc');
    });
});

test('createConfig should throw on invalid config file', t => {
  const host = new HostMock({
    '/paeckchen.json': "{'test': value}"
  }, '/');

  return createConfig({}, host)
    .then(() => t.fail('Expected error'))
    .catch(e => {
      t.truthy(e.message.match(/Failed to read config file/));
    });
});

test('createConfig should prefer output directory option', t => {
  const host = new HostMock({
    '/paeckchen.json': '{"output": {"folder": "foo"}}'
  }, '/');

  return createConfig({outputDirectory: 'bar'}, host)
    .then(config => {
      t.is(config.output.folder, 'bar');
    });
});

test('createConfig should prefer output file option', t => {
  const host = new HostMock({
    '/paeckchen.json': '{"output": {"file": "foo"}}'
  }, '/');

  return createConfig({outputFile: 'bar'}, host)
    .then(config => {
      t.is(config.output.file, 'bar');
    });
});

test('createConfig should read alias from config file', t => {
  const host = new HostMock({
    '/paeckchen.json': '{"aliases": {"module": "/some/path"}}'
  }, '/');

  return createConfig({}, host)
    .then(config => {
      t.deepEqual(config.aliases, {'module': '/some/path'} as {[name: string]: string});
    });
});

test('createConfig should join single alias into config', t => {
  const host = new HostMock({
    '/paeckchen.json': '{"aliases": {"module": "/some/path"}}'
  }, '/');

  return createConfig({alias: 'name=path'}, host)
    .then(config => {
      const expected: {[name: string]: string} = {
        module: '/some/path',
        name: 'path'
      };
      t.deepEqual(config.aliases, expected);
    });
});

test('createConfig should join multi aliases into config', t => {
  const host = new HostMock({
    '/paeckchen.json': '{"aliases": {"module": "/some/path"}}'
  }, '/');

  return createConfig({alias: ['name=path', 'name2=path2']}, host)
    .then(config => {
      const expected: {[name: string]: string} = {
        module: '/some/path',
        name: 'path',
        name2: 'path2'
      };
      t.deepEqual(config.aliases, expected);
    });
});

test('createConfig should create options from aliases', t => {
  const host = new HostMock({
    '/paeckchen.json': '{}'
  }, '/');

  return createConfig({alias: 'name=path'}, host)
    .then(config => {
      const expected: {[name: string]: string} = {
        name: 'path',
      };
      t.deepEqual(config.aliases, expected);
    });
});

test('createConfig should read runtime from config file', t => {
  const host = new HostMock({
    '/paeckchen.json': '{"output": {"runtime": "node"}}'
  }, '/');

  return createConfig({}, host)
    .then(config => {
      t.deepEqual(config.output.runtime, Runtime.node);
    });
});

test('createConfig should prefer runtime from options', t => {
  const host = new HostMock({
    '/paeckchen.json': '{"output": {"runtime": "node"}}'
  }, '/');

  return createConfig({runtime: 'browser'}, host)
    .then(config => {
      t.deepEqual(config.output.runtime, Runtime.browser);
    });
});

test('createConfig should read externals from config file', t => {
  const host = new HostMock({
    '/paeckchen.json': '{"externals": {"module": "Global"}}'
  }, '/');

  return createConfig({}, host)
    .then(config => {
      t.deepEqual(config.externals, {'module': 'Global'} as {[name: string]: string});
    });
});

test('createConfig should join single external into config', t => {
  const host = new HostMock({
    '/paeckchen.json': '{"externals": {"module": "Global"}}'
  }, '/');

  return createConfig({external: 'name=var'}, host)
    .then(config => {
      const expected: {[name: string]: string} = {
        module: 'Global',
        name: 'var'
      };
      t.deepEqual(config.externals, expected);
    });
});

test('createConfig should join multi externals into config', t => {
  const host = new HostMock({
    '/paeckchen.json': '{"externals": {"module": "Global"}}'
  }, '/');

  return createConfig({external: ['name=var', 'name2=var2']}, host)
    .then(config => {
      const expected: {[name: string]: string} = {
        module: 'Global',
        name: 'var',
        name2: 'var2'
      };
      t.deepEqual(config.externals, expected);
    });
});

test('createConfig should create options from externals', t => {
  const host = new HostMock({
    '/paeckchen.json': '{}'
  }, '/');

  return createConfig({external: 'name=var'}, host)
    .then(config => {
      const expected: {[name: string]: string} = {
        name: 'var',
      };
      t.deepEqual(config.externals, expected);
    });
});

test('createConfig should read loglevel from config file', t => {
  const host = new HostMock({
    '/paeckchen.json': '{"logLevel": "debug"}'
  }, '/');

  return createConfig({}, host)
    .then(config => {
      t.deepEqual(config.logLevel, LogLevel.debug);
    });
});

test('createConfig should prefer loglevel from options', t => {
  const host = new HostMock({
    '/paeckchen.json': '{"logLevel": "debug"}'
  }, '/');

  return createConfig({logLevel: 'trace'}, host)
    .then(config => {
      t.deepEqual(config.logLevel, LogLevel.trace);
    });
});

test('createConfig should fail on invalid loglevel', t => {
  const host = new HostMock({
    '/paeckchen.json': '{"logLevel": "foo"}'
  }, '/');

  return createConfig({}, host)
    .then(config => {
      t.fail('Expected exception');
    })
    .catch(e => {
      t.regex(e.message, /Invalid logLevel/);
    });
});

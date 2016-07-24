import test from 'ava';
import { IPaeckchenContext } from '../src/bundle';
import { SourceSpec, Runtime } from '../src/config';
import { NoopLogger } from '../src/logger';
import { generate, HostMock, virtualModule } from './helper';

import { buildArray, buildObject, buildValue, wrapJsonFile } from '../src/bundle-json';

test('buildArray should create a valid array expression', t => {
  const input = [0, 1, 2];
  return generate(buildArray(input) as any)
    .then(code => {
      t.deepEqual(JSON.parse(code), input);
    });
});

test('buildObject should create a valid object expression', t => {
  const input = {a: 0, b: 1, c: 2};
  return generate(buildObject(input) as any)
    .then(code => {
      t.deepEqual(JSON.parse(code), input);
    });
});

test('buildValue given null should return a null literal', t => {
  const input: any = null;
  return generate(buildValue(input) as any)
    .then(code => {
      t.deepEqual(JSON.parse(code), input);
    });
});

test('buildValue given a number should return a number literal', t => {
  const input = 0;
  return generate(buildValue(input) as any)
    .then(code => {
      t.deepEqual(JSON.parse(code), input);
    });
});

test('buildValue given a boolean should return a boolean literal', t => {
  const input = true;
  return generate(buildValue(input) as any)
    .then(code => {
      t.deepEqual(JSON.parse(code), input);
    });
});

test('buildValue given an array should return an array literal', t => {
  const input = ['a', 'b', 'c'];
  return generate(buildValue(input) as any)
    .then(code => {
      t.deepEqual(JSON.parse(code), input);
    });
});

test('buildValue given an object should return an object literal', t => {
  const input = {key: 'value'};
  return generate(buildValue(input) as any)
    .then(code => {
      t.deepEqual(JSON.parse(code), input);
    });
});

test('buildValue should allow nesting', t => {
  const input = {
    key: 'value',
    array: [
      0, 1, true, null, {
        key: 'value'
      }
    ]
  };
  return generate(buildValue(input) as any)
    .then(code => {
      t.deepEqual(JSON.parse(code), input);
    });
});

test('wrapJsonFile should return a requested json file as ast program exporting the json data', t => {
  const context: IPaeckchenContext =  {
    config: {
      input: {
        entryPoint: '',
        source: SourceSpec.ES2015
      },
      output: {
        folder: './',
        file: undefined,
        runtime: Runtime.browser,
        sourceMap: false
      },
      aliases: {},
      externals: {},
      watchMode: false
    },
    host: new HostMock({
      '/file.json': `{"key": "value"}`
    }, '/'),
    logger: new NoopLogger()
  };

  return wrapJsonFile('/file.json', context)
    .then(program => generate(program)
    .then(code => {
      t.deepEqual(virtualModule(code), {key: 'value'});
    }));
});

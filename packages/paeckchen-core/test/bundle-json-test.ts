import test from 'ava';
import { IPaeckchenContext } from '../src/bundle';
import { SourceSpec, Runtime } from '../src/config';
import { NoopLogger } from '../src/logger';
import { generate, HostMock, virtualModule } from './helper';

import { buildArray, buildObject, buildValue, wrapJsonFile } from '../src/bundle-json';

test('buildArray should create a valid array expression', t => {
  const input = [0, 1, 2];
  t.deepEqual(JSON.parse(generate(buildArray(input) as any)), input);
});

test('buildObject should create a valid object expression', t => {
  const input = {a: 0, b: 1, c: 2};
  t.deepEqual(JSON.parse(generate(buildObject(input) as any)), input);
});

test('buildValue given null should return a null literal', t => {
  const input: any = null;
  t.deepEqual(JSON.parse(generate(buildValue(input) as any)), input);
});

test('buildValue given a number should return a number literal', t => {
  const input = 0;
  t.deepEqual(JSON.parse(generate(buildValue(input) as any)), input);
});

test('buildValue given a boolean should return a boolean literal', t => {
  const input = true;
  t.deepEqual(JSON.parse(generate(buildValue(input) as any)), input);
});

test('buildValue given an array should return an array literal', t => {
  const input = ['a', 'b', 'c'];
  t.deepEqual(JSON.parse(generate(buildValue(input) as any)), input);
});

test('buildValue given an object should return an object literal', t => {
  const input = {key: 'value'};
  t.deepEqual(JSON.parse(generate(buildValue(input) as any)), input);
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
  t.deepEqual(JSON.parse(generate(buildValue(input) as any)), input);
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

  const code = generate(wrapJsonFile('/file.json', context));

  t.deepEqual(virtualModule(code), {key: 'value'});
});

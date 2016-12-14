import test from 'ava';

import { PaeckchenContext } from '../src/bundle';
import { SourceSpec, Runtime, LogLevel } from '../src/config';
import { NoopLogger } from '../src/logger';
import { generate, HostMock, virtualModule } from './helper';

import { buildArray, buildObject, buildValue, wrapJsonFile } from '../src/bundle-json';

test('buildArray should create a valid array expression', async t => {
  const input = [0, 1, 2];
  const code = await generate(buildArray(input) as any);

  t.deepEqual(JSON.parse(code), input);
});

test('buildObject should create a valid object expression', async t => {
  const input = {a: 0, b: 1, c: 2};
  const code = await generate(buildObject(input) as any);

  t.deepEqual(JSON.parse(code), input);
});

test('buildValue given null should return a null literal', async t => {
  const input: any = null;
  const code = await generate(buildValue(input) as any);

  t.deepEqual(JSON.parse(code), input);
});

test('buildValue given a number should return a number literal', async t => {
  const input = 0;
  const code = await generate(buildValue(input) as any);

  t.deepEqual(JSON.parse(code), input);
});

test('buildValue given a boolean should return a boolean literal', async t => {
  const input = true;
  const code = await generate(buildValue(input) as any);

  t.deepEqual(JSON.parse(code), input);
});

test('buildValue given an array should return an array literal', async t => {
  const input = ['a', 'b', 'c'];
  const code = await generate(buildValue(input) as any);

  t.deepEqual(JSON.parse(code), input);
});

test('buildValue given an object should return an object literal', async t => {
  const input = {key: 'value'};
  const code = await generate(buildValue(input) as any);

  t.deepEqual(JSON.parse(code), input);
});

test('buildValue should allow nesting', async t => {
  const input = {
    key: 'value',
    array: [
      0, 1, true, null, {
        key: 'value'
      }
    ]
  };
  const code = await generate(buildValue(input) as any);

  t.deepEqual(JSON.parse(code), input);
});

test('wrapJsonFile should return a requested json file as ast program exporting the json data', async t => {
  const context: PaeckchenContext =  {
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
      watchMode: false,
      logLevel: LogLevel.default,
      debug: false
    },
    host: new HostMock({
      '/file.json': `{"key": "value"}`
    }, '/'),
    logger: new NoopLogger()
  };

  const program = await wrapJsonFile('/file.json', context);
  const code = await generate(program);

  t.deepEqual(virtualModule(code), {key: 'value'});
});

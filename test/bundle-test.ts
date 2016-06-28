import test from 'ava';
import { join } from 'path';
import { HostMock, virtualModule } from './helper';
import { reset } from '../src/modules';

import { bundle } from '../src/bundle';

test.beforeEach(() => {
  reset();
});

test('bundle should bundle the given entry-point and its dependencies', t => {
  const host = new HostMock({
    'entry-point.js': `
      import fn from './dependency';
      fn();
    `,
    './dependency.js': `
      export default function() {
        callme();
      }
    `
  });

  const bundled = bundle({entryPoint: 'entry-point.js'}, host);

  let called = false;
  virtualModule(bundled, {
    callme: function(): void {
      called = true;
    }
  });
  t.true(called);
});

test('bundle should bundle global dependencies', t => {
  const host = new HostMock({
    '/entry-point.js': `
      Buffer.isBuffer();
    `,
    // npm2
    [join(process.cwd(), ...'../../node_modules/node-libs-browser/node_modules/buffer/index.js'.split('/'))]: `
      export const Buffer = {
        isBuffer() {
          callme();
        }
      };
    `,
    // npm3
    [join(process.cwd(), ...'../../node_modules/buffer/index.js'.split('/'))]: `
      export const Buffer = {
        isBuffer() {
          callme();
        }
      };
    `
  }, '/');

  const bundled = bundle({entryPoint: '/entry-point.js'}, host);

  let called = false;
  virtualModule(bundled, {
    callme: function(): void {
      called = true;
    }
  });
  t.true(called);
});

test('bundle should check for a config-file', t => {
  const host = new HostMock({
    '/entry-point.js': `
      callback();
    `,
    '/paeckchen.json': `
      {
        "input": {
          "entry": "./entry-point"
        }
      }
    `
  }, '/');

  const bundled = bundle({}, host);

  let called = false;
  virtualModule(bundled, {
    callback: function(): void {
      called = true;
    }
  });
  t.true(called);
});

test('bundle should throw if no entry-point configured', t => {
  const host = new HostMock({
    '/paeckchen.json': '{}'
  }, '/');

  t.throws(() => bundle({}, host), 'Missing entry-point');
});

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

  const bundled = bundle('entry-point.js', host);

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
    [join(process.cwd(), ...'../../node_modules/node-libs-browser/node_modules/buffer/index.js'.split('/'))]: `
      export const Buffer = {
        isBuffer() {
          callme();
        }
      };
    `
  }, '/');

  const bundled = bundle('/entry-point.js', host);

  let called = false;
  virtualModule(bundled, {
    callme: function(): void {
      called = true;
    }
  });
  t.true(called);
});

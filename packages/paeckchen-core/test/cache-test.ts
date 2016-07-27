import test from 'ava';
import { HostMock } from './helper';

import { readCache } from '../src/cache';

test('cache should be disabled in non debug mode', t => {
  const host = new HostMock({
    'paeckchen.cache.json': `{
      "globals": {}
    }`
  });
  const context = {
    config: {
      debug: false
    },
    host
  };
  return readCache(context as any)
    .then(cache => {
      t.deepEqual(cache, {});
    });
});

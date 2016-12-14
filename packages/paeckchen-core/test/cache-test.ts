import test from 'ava';

import { HostMock } from './helper';

import { readCache } from '../src/cache';

test('cache should be disabled in non debug mode', async t => {
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
  const cache = await readCache(context as any);

  t.deepEqual(cache, {});
});

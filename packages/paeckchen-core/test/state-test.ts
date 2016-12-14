import test from 'ava';
import { resolve } from 'path';

import { HostMock, errorLogger } from './helper';

import { State } from '../src/state';

test('getAndIncrementModuleIndex should update the next module index', t => {
  const state = new State([]);

  t.is(state.getAndIncrementModuleIndex(), 0);
  t.is(state.getAndIncrementModuleIndex(), 1);
});

test('save should return a serialized state object', t => {
  const state = new State([]);

  const result = state.save();

  t.deepEqual(result.detectedGlobals, {
    global: false,
    process: false,
    buffer: false
  });
  t.is(result.nextModuleIndex, 0);
  t.deepEqual(result.wrappedModules, []);
});

test('load should create and revalidate state from serialized state object', async t => {
  const host = new HostMock({
    'name1': ''
  });
  host.getModificationTime = () => Promise.resolve(234);
  const state = new State([]);
  const context = {
    config: {
      input: {
        entryPoint: ''
      }
    },
    host,
    logger: errorLogger
  } as any;
  let calledUpdate = 0;
  const update  = (name: string, remove: boolean, _state: State) => {
    if (remove) {
      t.is(name, 'name2');
    }
    calledUpdate++;
  };
  let calledEnqueue = 0;
  const enqueue = () => calledEnqueue++;

  const input = {
    wrappedModules: [{
      index: 0,
      name: resolve('name1'),
      remove: false,
      mtime: 123
    }, {
      index: 1,
      name: 'name2',
      remove: false,
      mtime: Number.MAX_SAFE_INTEGER
    }]
  };
  await state.load(context, input, update, enqueue);

  t.is(calledUpdate, 2);
  t.is(calledEnqueue, 2);
});

import { assert } from 'chai';

import { HostMock } from './helper';
import { getModulePath } from '../src/module-path';

describe('getModulePath', () => {
  it('should throw no non existing module', () => {
    const host = new HostMock({});
    try {
      getModulePath('some/where', './else', host);
      assert.fail('should throw');
    } catch (e) {
      // expected
    }
  });

  it('should resolve an existing relative file', () => {
    const host = new HostMock({
      'some/else': ''
    });
    assert.equal(getModulePath('some/where', './else', host), 'some/else');
  });

  it('should resolve a relative file while adding .js', () => {
    const host = new HostMock({
      'some/else.js': ''
    });
    assert.equal(getModulePath('some/where', './else', host), 'some/else.js');
  });

  it('should resolve a relative directory with package.json and main', () => {
    const host = new HostMock({
      'some/dir/package.json': '{"main": "./main.js"}',
      'some/dir/main.js': ''
    });
    assert.equal(getModulePath('some/where', './dir', host), 'some/dir/main.js');
  });

  it('should resolve a relative directory without package.json but index.js', () => {
    const host = new HostMock({
      'some/dir/index.js': ''
    });
    assert.equal(getModulePath('some/where', './dir', host), 'some/dir/index.js');
  });

  it('should resolve from node_modules', () => {
    const host = new HostMock({
      'dir/node_modules/mod/index.js': ''
    });
    assert.equal(getModulePath('dir/some/where', 'mod', host), 'dir/node_modules/mod/index.js');
  });
});

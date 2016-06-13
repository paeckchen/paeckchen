import { assert } from 'chai';
import { join, dirname } from 'path';

import { IHost } from '../src/host';
import { getModulePath } from '../src/module-path';

class TestHost implements IHost {
  private files: string[];
  constructor(...files: string[]) {
    this.files = files;
  }

  public pathSep: string = '/';

  public fileExists(path: string): boolean {
    return this.files.indexOf(path) > -1;
  };
  public readFile(path: string): string { return '{"main": "./main.js"}'; };
  public joinPath(...paths: string[]): string { return join(...paths); };
  public dirname(path: string): string { return dirname(path); };
}

describe('getModulePath', () => {
  it('should throw no non existing module', () => {
    const host = new TestHost();
    try {
      getModulePath('some/where', './else', host);
      assert.fail('should throw');
    } catch (e) {
      // expected
    }
  });

  it('should resolve an existing relative file', () => {
    const host = new TestHost('some/else');
    assert.equal(getModulePath('some/where', './else', host), 'some/else');
  });

  it('should resolve a relative file while adding .js', () => {
    const host = new TestHost('some/else.js');
    assert.equal(getModulePath('some/where', './else', host), 'some/else.js');
  });

  it('should resolve a relative directory with package.json and main', () => {
    const host = new TestHost('some/dir/package.json', 'some/dir/main.js');
    assert.equal(getModulePath('some/where', './dir', host), 'some/dir/main.js');
  });

  it('should resolve a relative directory without package.json but index.js', () => {
    const host = new TestHost('some/dir/index.js');
    assert.equal(getModulePath('some/where', './dir', host), 'some/dir/index.js');
  });

  it('should resolve from node_modules', () => {
    const host = new TestHost('dir/node_modules/mod/index.js');
    assert.equal(getModulePath('dir/some/where', 'mod', host), 'dir/node_modules/mod/index.js');
  });
});

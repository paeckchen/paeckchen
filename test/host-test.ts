import { assert } from 'chai';
import { join } from 'path';
import { readFileSync } from 'fs';

import { IHost, DefaultHost } from '../src/host';

describe('DefaultHost', () => {
  let host: IHost;

  beforeEach(() => {
    host = new DefaultHost();
  });

  it('fileExists should return true for existing file', () => {
    assert.isTrue(host.fileExists('./package.json'));
  });

  it('fileExists should return false for non-existing file', () => {
    assert.isFalse(host.fileExists('./package.json2'));
  });

  it('isFile should return true for file', () => {
    assert.isTrue(host.isFile('./package.json'));
  });

  it('isFile should return false for directory', () => {
    assert.isFalse(host.isFile('./node_modules'));
  });

  it('readFile should return the file content', () => {
    const path = join(process.cwd(), 'package.json');
    assert.deepEqual(host.readFile(path), readFileSync(path).toString());
  });

  it('pathSep should return the path separator', () => {
    assert.equal(host.pathSep, '/');
  });

  it('joinPath should return joined paths', () => {
    assert.equal(host.joinPath('a', 'b', 'c'), 'a/b/c');
  });

  it('dirname should return the directory part of the given path', () => {
    assert.equal(host.dirname('a/b/c'), 'a/b');
  });
});

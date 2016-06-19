import test from 'ava';
import { readFileSync } from 'fs';

import { DefaultHost } from '../src/host';

test.beforeEach(t => {
  t.context.host = new DefaultHost();
});

test('DefaultHost#fileExists should return true for existing file', t => {
  t.true(t.context.host.fileExists('../../package.json'));
});

test('DefaultHost#fileExists should return false for non-existing file', t => {
  t.false(t.context.host.fileExists('./package.json'));
});

test('DefaultHost#isFile should return true for file', t => {
  t.true(t.context.host.isFile('../../package.json'));
});

test('DefaultHost#isFile should return false for directory', t => {
  t.false(t.context.host.isFile('../../node_modules'));
});

test('DefaultHost#readFile should return the file content', t => {
  const path = '../../package.json';
  t.deepEqual(t.context.host.readFile(path), readFileSync(path).toString());
});

test('DefaultHost#pathSep should return the path separator', t => {
  t.deepEqual(t.context.host.pathSep, '/');
});

test('DefaultHost#joinPath should return joined paths', t => {
  t.deepEqual(t.context.host.joinPath('a', 'b', 'c'), 'a/b/c');
});

test('DefaultHost#dirname should return the directory part of the given path', t => {
  t.deepEqual(t.context.host.dirname('a/b/c'), 'a/b');
});

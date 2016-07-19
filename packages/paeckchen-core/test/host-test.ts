import test from 'ava';
import { resolve, sep, join } from 'path';
import { readFileSync, existsSync, unlinkSync } from 'fs';

import { DefaultHost } from '../src/host';

test.beforeEach(t => {
  t.context.host = new DefaultHost();
});

test('DefaultHost#cwd should return the current directory', t => {
  t.is(t.context.host.cwd(), process.cwd());
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
  t.deepEqual(t.context.host.pathSep, sep);
});

test('DefaultHost#joinPath should return joined paths', t => {
  t.deepEqual(t.context.host.joinPath('a', 'b', 'c'), join('a', 'b', 'c'));
});

test('DefaultHost#dirname should return the directory part of the given path', t => {
  t.deepEqual(t.context.host.dirname('a/b/c'), 'a/b');
});

test('DefaultHost#writeFile should dump the content to disk', t => {
  const file = resolve(process.cwd(), 'dump.txt');
  try {
    t.context.host.writeFile(file, 'test-data');
    t.is(readFileSync(file).toString(), 'test-data');
  } finally {
    if (existsSync(file)) {
      unlinkSync(file);
    }
  }
});

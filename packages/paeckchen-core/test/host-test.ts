import test from 'ava';
import { resolve } from 'path';
import { readFileSync, existsSync, unlinkSync } from 'fs';

import { DefaultHost } from '../src/host';

test.beforeEach(t => {
  t.context.host = new DefaultHost();
});

test('DefaultHost#cwd should return the current directory', t => {
  t.is((t.context.host as DefaultHost).cwd(), process.cwd());
});

test('DefaultHost#fileExists should return true for existing file', t => {
  t.true((t.context.host as DefaultHost).fileExists('../../package.json'));
});

test('DefaultHost#fileExists should return false for non-existing file', t => {
  t.false((t.context.host as DefaultHost).fileExists('./package.json'));
});

test('DefaultHost#isFile should return true for file', t => {
  t.true((t.context.host as DefaultHost).isFile('../../package.json'));
});

test('DefaultHost#isFile should return false for directory', t => {
  t.false((t.context.host as DefaultHost).isFile('../../node_modules'));
});

test('DefaultHost#readFile should return the file content', t => {
  const path = '../../package.json';
  t.deepEqual((t.context.host as DefaultHost).readFile(path), readFileSync(path).toString());
});

test('DefaultHost#writeFile should dump the content to disk', t => {
  const file = resolve(process.cwd(), 'dump.txt');
  try {
    (t.context.host as DefaultHost).writeFile(file, 'test-data');
    t.is(readFileSync(file).toString(), 'test-data');
  } finally {
    if (existsSync(file)) {
      unlinkSync(file);
    }
  }
});

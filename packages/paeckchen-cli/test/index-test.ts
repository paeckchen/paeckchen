import test from 'ava';
import { resolve } from 'path';
import * as execa from 'execa';

test.cb('cli without parameters and config file should show error', t => {
  execa('node', [resolve(process.cwd(), '..', 'src', 'index.js')])
    .catch(err => {
        t.regex(err.stderr.toString(), /Missing entry-point/);
        t.end();
      });
});

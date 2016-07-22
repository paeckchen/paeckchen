import test from 'ava';
import { readFileSync, statSync, unlinkSync } from 'fs';
import { resolve, join } from 'path';
import * as execa from 'execa';
import { runInNewContext } from 'vm';

test.beforeEach('remove test file', t => {
  const resultFile = join('fixtures', 'result.js');
  try {
    if (statSync(resultFile).isFile()) {
      unlinkSync(resultFile);
    }
  } catch (e) {
    // ignore if there is no file
  }
  t.context.resultFile = resultFile;
});

test.cb('cli without parameters and config file should show error', t => {
  execa('node', [resolve(process.cwd(), '..', 'src', 'index.js')])
    .then(result => {
      t.fail('There should be an error from the cli');
      t.end();
    })
    .catch(err => {
      t.regex(err.stderr.toString(), /Missing entry-point/);
      t.end();
    });
});

test.cb('cli with entry-point should output bundle', t => {
  const args = [
    resolve(process.cwd(), '..', 'src', 'index.js'),
    '--entry',
    join('fixtures', 'entry.js')
  ];
  execa('node', args)
    .then(result => {
      const code = result.stdout.toString();

      let stdout = '';
      const sandbox = {
        console: {
          log: function(msg: string): void {
            stdout += msg;
          }
        }
      };
      runInNewContext(code, sandbox);

      t.is(stdout, 'string');
      t.end();
    })
    .catch(err => {
      console.error(err);
      console.error(err.stack);
      t.fail('There should be no error from the cli');
      t.end();
    });
});

test.cb('cli with entry-point and out-file should write bundle', t => {
  const args = [
    resolve(process.cwd(), '..', 'src', 'index.js'),
    '--entry',
    join('fixtures', 'entry.js'),
    '--out-file',
    t.context.resultFile
  ];
  execa('node', args)
    .then(result => {
      const code = readFileSync(t.context.resultFile).toString();

      let output = '';
      const sandbox = {
        console: {
          log: function(msg: string): void {
            output += msg;
          }
        }
      };
      runInNewContext(code, sandbox);

      t.is(output, 'string');
      t.end();
    })
    .catch(err => {
      console.error(err);
      t.fail('There should be no error from the cli');
      t.end();
    });
});

test.cb('cli without TERM should not fail', t => {
  const args = [
    resolve(process.cwd(), '..', 'src', 'index.js'),
    '--entry',
    join('fixtures', 'entry.js')
  ];
  execa('node', args, {env: { TERM: '' }})
    .then(result => {
      t.not(result.stdout.toString(), '');
      t.end();
    })
    .catch(err => {
      t.fail();
      t.end();
    });
});

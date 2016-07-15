import test from 'ava';
import { resolve, join } from 'path';
import * as execa from 'execa';
import { runInNewContext } from 'vm';

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
        t.fail('There should be no error from the cli');
        t.end();
      });
});

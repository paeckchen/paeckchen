import test from 'ava';
import { readFileSync, statSync, unlinkSync } from 'fs';
import { resolve, join } from 'path';
import * as execa from 'execa';
import { runInNewContext } from 'vm';

test.beforeEach('remove test file', t => {
  const codeFile = join('fixtures', 'result.js');
  const mapFile = join('fixtures', 'result.js.map');
  try {
    if (statSync(codeFile).isFile()) {
      unlinkSync(codeFile);
    }
    if (statSync(mapFile).isFile()) {
      unlinkSync(mapFile);
    }
  } catch (e) {
    // ignore if there is no file
  }
  t.context.codeFile = codeFile;
  t.context.mapFile = mapFile;
});

test.cb('cli without parameters and config file should show error', t => {
  const options = {
    env: {
      DEBUG: 'cli'
    }
  };
  execa('node', [resolve(process.cwd(), '..', 'src', 'index.js')], options)
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
    t.context.codeFile
  ];
  execa('node', args)
    .then(result => {
      const code = readFileSync(t.context.codeFile).toString();

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

test.cb('cli with entry-point and source-map should output bundle', t => {
  const args = [
    resolve(process.cwd(), '..', 'src', 'index.js'),
    '--entry',
    join('fixtures', 'entry.js'),
    '--source-map'
  ];
  execa('node', args)
    .then(result => {
      const code = result.stdout.toString();

      t.truthy(code.match(/\/\/# sourceMappingURL=data:application\/json;charset=utf-8;base64,/));
      t.end();
    })
    .catch(err => {
      console.error(err);
      console.error(err.stack);
      t.fail('There should be a source mapping url');
      t.end();
    });
});

test.cb('cli with entry-point, out-file and source-map should write external map', t => {
  const args = [
    resolve(process.cwd(), '..', 'src', 'index.js'),
    '--entry',
    join('fixtures', 'entry.js'),
    '--out-file',
    t.context.codeFile,
    '--source-map'
  ];
  execa('node', args)
    .then(result => {
      const map = JSON.parse(readFileSync(t.context.mapFile).toString());

      t.truthy(map.sourcesContent[0].match(/: string/));
      t.end();
    })
    .catch(err => {
      console.error(err);
      t.fail('There should a type-annotation in the source-map');
      t.end();
    });
});

import test from 'ava';
import * as execa from 'execa';
import { readFileSync, statSync, unlinkSync } from 'fs';
import { resolve, join } from 'path';
import { runInNewContext } from 'vm';

test.beforeEach('remove test file', t => {
  const seed = Math.random() * 1000000000000000;
  const codeFile = join('fixtures', `result-${seed}.js`);
  const mapFile = join('fixtures', `result-${seed}.js.map`);
  t.context.codeFile = codeFile;
  t.context.mapFile = mapFile;
});

test.afterEach(t => {
  try {
    if (statSync(t.context.codeFile).isFile()) {
      unlinkSync(t.context.codeFile);
    }
  } catch (e) {
    // ignore if there is no file
  }
  try {
    if (statSync(t.context.mapFile).isFile()) {
      unlinkSync(t.context.mapFile);
    }
  } catch (e) {
    // ignore if there is no file
  }
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
          log(msg: string): void {
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
          log(msg: string): void {
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
    '--source-map', 'true'
  ];
  execa('node', args)
    .then(result => {
      const code = result.stdout.toString();

      t.regex(code, /\/\/# sourceMappingURL=data:application\/json;charset=utf-8;base64,/);
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
    '--source-map', 'true'
  ];
  execa('node', args)
    .then(result => {
      const map = JSON.parse(readFileSync(t.context.mapFile).toString());

      t.truthy(map.sourcesContent[0].match(/: string/));
      t.end();
    })
    .catch(err => {
      console.error(err);
      t.fail('There should be a type-annotation in the source-map');
      t.end();
    });
});

test.cb("cli with entry-point, out-file and source-map 'inline' should write inline map", t => {
  const args = [
    resolve(process.cwd(), '..', 'src', 'index.js'),
    '--entry',
    join('fixtures', 'entry.js'),
    '--out-file',
    t.context.codeFile,
    '--source-map', 'inline'
  ];
  execa('node', args)
    .then(result => {
      const code = readFileSync(t.context.codeFile).toString();
      try {
        statSync(t.context.mapFile);
        t.fail('There should be no external map file');
      } catch (e) {
        // ignore
      }

      t.regex(code, /\/\/# sourceMappingURL=data:application\/json;charset=utf-8;base64,/);
      t.end();
    })
    .catch(err => {
      console.error(err);
      t.fail('There should be an inline source-map');
      t.end();
    });
});

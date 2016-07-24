import test from 'ava';
import { NoopLogger } from '../../src/logger';
import { HostMock, virtualModule, virtualModuleResult, parse, generate } from '../helper';

import { rewriteGlobalLocals } from '../../src/plugins/global-locals';

function rewriteExports(input: string, files: any = {}): Promise<string> {
  const host = new HostMock(files, '/cwd');
  const context = {
    config: {} as any,
    host,
    logger: new NoopLogger()
  };

  return parse(input)
    .then(ast =>
      rewriteGlobalLocals(ast, '/cwd/path/to/name', context).then(() =>
        generate(ast)));
}

function executeExports(input: string, files: any = {}, settings: any = {},
    requireResults: any[] = []): Promise<virtualModuleResult> {
  return rewriteExports(input, files).then(processed =>
    virtualModule(processed, settings, requireResults));
}

test('rewriteGlobalLocals plugin should wrap module in closure with __filename and __dirname', t => {
  const input = `
    filename(__filename);
    dirname(__dirname);
  `;
  let calledFilename: string|undefined;
  let calledDirname: string|undefined;
  const settings = {
    filename(name: string): void {
      calledFilename = name;
    },
    dirname(name: string): void {
      calledDirname = name;
    }
  };

  return executeExports(input, {}, settings)
    .then(() => {
      t.is(calledFilename, '/cwd/path/to/name');
      t.is(calledDirname, '/cwd/path/to');
    });
});

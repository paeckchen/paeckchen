import test from 'ava';
import { HostMock, virtualModule, virtualModuleResult, parseAndProcess } from '../helper';

import { rewriteGlobalLocals } from '../../src/plugins/global-locals';

function rewriteExports(input: string, files: any = {}): string {
  const host = new HostMock(files, '/cwd');

  return parseAndProcess(input, ast => {
    return rewriteGlobalLocals(ast, '/cwd/path/to/name', { config: {} as any, host });
  });
}

function executeExports(input: string, files: any = {}, settings: any = {},
    requireResults: any[] = []): virtualModuleResult {
  const processed = rewriteExports(input, files);
  return virtualModule(processed, settings, requireResults);
}

test('rewriteGlobalLocals plugin should wrap module in closure with __filename and __dirname', t => {
  const input = `
    filename(__filename);
    dirname(__dirname);
  `;

  let calledFilename: string;
  let calledDirname: string;
  executeExports(input, {}, {
    filename(name: string): void {
      calledFilename = name;
    },
    dirname(name: string): void {
      calledDirname = name;
    }
  });

  t.is(calledFilename, '/path/to/name');
  t.is(calledDirname, '/path/to');
});

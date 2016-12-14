import test from 'ava';

import { NoopLogger } from '../../src/logger';
import { HostMock, virtualModule, virtualModuleResult, parse, generate } from '../helper';

import { rewriteGlobalLocals } from '../../src/plugins/global-locals';

async function rewriteExports(input: string, files: any = {}): Promise<string> {
  const host = new HostMock(files, '/cwd');
  const context = {
    config: {} as any,
    host,
    logger: new NoopLogger()
  };

  const ast = await parse(input);
  await rewriteGlobalLocals(ast, '/cwd/path/to/name', context);
  return generate(ast);
}

async function executeExports(input: string, files: any = {}, settings: any = {},
    requireResults: any[] = []): Promise<virtualModuleResult> {
  const processed = await rewriteExports(input, files);
  return virtualModule(processed, settings, requireResults);
}

test('rewriteGlobalLocals plugin should wrap module in closure with __filename and __dirname', async t => {
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

  await executeExports(input, {}, settings);

  t.is(calledFilename, '/cwd/path/to/name');
  t.is(calledDirname, '/cwd/path/to');
});

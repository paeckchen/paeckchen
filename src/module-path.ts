import { IHost, DefaultHost } from './host';
import * as nodeCoreLibs from 'node-libs-browser';

export function getModulePath(currentModule: string, importPath: string, host: IHost = new DefaultHost()): string {
  function notFound(): void {
    throw new Error(`Module ${importPath} not found`);
  }
  function resolveAsFile(file: string): string {
    if (host.fileExists(file) && host.isFile(file)) {
      return file;
    }
    const filePath = file + '.js';
    if (host.fileExists(filePath) && host.isFile(filePath)) {
      return filePath;
    }
  }
  function resolveAsDirectory(dir: string): string {
    const pkg = host.joinPath(dir, 'package.json');
    if (host.fileExists(pkg) && host.isFile(pkg)) {
      const main = JSON.parse(host.readFile(pkg).toString())['main'];
      if (main) {
        const result = resolveAsFile(host.joinPath(dir, main));
        if (result) {
          return result;
        }
      }
    }
    const index = host.joinPath(dir, 'index.js');
    if (host.fileExists(index) && host.isFile(index)) {
      return index;
    }
  }
  function resolveAsFileOrDirectory(inputPath: string): string {
    const result = resolveAsFile(inputPath);
    if (result) {
      return result;
    }
    return resolveAsDirectory(inputPath);
  }
  function resolveAsNodeModule(current: string, imported: string): string {
    function getNodeModulesPaths(start: string): string[] {
      const parts = start.split(host.pathSep);
      let i = parts.length - 1;
      const dirs: string[] = [];
      while (i > -1) {
        if (parts[i] !== 'node_modules') {
          dirs.push(host.joinPath(parts.slice(0, i + 1).join(host.pathSep), 'node_modules'));
        }
        i--;
      }
      return dirs;
    }
    const dirs = getNodeModulesPaths(current);
    for (let i = 0, n = dirs.length; i < n; i++) {
      const result = resolveAsFileOrDirectory(host.joinPath(dirs[i], imported));
      if (result) {
        return result;
      }
    }
  }

  if (importPath.charAt(0) === '.' || importPath.charAt(0) === '/') {
    const fileOrPath = importPath.charAt(0) === '/'
      ? importPath
      : host.joinPath(host.dirname(currentModule), importPath);
    const result = resolveAsFileOrDirectory(fileOrPath);
    if (result) {
      return result;
    }
  }
  const result = resolveAsNodeModule(currentModule, importPath);
  if (result) {
    return result;
  }
  // Check for node core modules
  const coreLib = (nodeCoreLibs as any)[importPath];
  if (coreLib) {
    return coreLib;
  }
  notFound();
}

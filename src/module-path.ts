import { IHost } from './host';
import { sync as browserResolveSync } from 'browser-resolve';
import * as nodeCoreLibs from 'node-libs-browser';

interface IPackage {
  main: string;
  browser?: string;
  'jsnext:main'?: string;
}

/**
 * Return package data with normalized main fields
 * Precedence: browser, jsnext:main, main
 *
 * @param pkg Package data
 */
function normalizePackage(pkg: IPackage): IPackage {
  // .browser, use package data as is
  if ('browser' in pkg) {
    return pkg;
  }

  // no .browser, .jsnext:main, use jsnext:main by aliasing to .main
  if ('jsnext:main' in pkg) {
    pkg.main = pkg['jsnext:main'];
    return pkg;
  }

  // use .main
  return pkg;
}

/**
 * Return a resolved module path
 *
 * @param filename Path to file from where importPath is resolved
 * @param importIdentifier Identifier to resolve from filename
 * @param [host]
 * @return either the absolute path to the requested module or the name of a node core module
 * @throws when failing to resolve requested module
 */
export function getModulePath(filename: string, importIdentifier: string, host: IHost): string {
  return browserResolveSync(importIdentifier, {
    filename: filename,
    modules: nodeCoreLibs,
    packageFilter: normalizePackage,
    readFileSync: (path: string): Buffer => new Buffer(host.readFile(path)),
    isFile: (filePath: string): boolean => host.fileExists(filePath) && host.isFile(filePath)
  });
}

/**
 * @param moduleName The module name to check
 * @return true if the given (resolved) moduleName is a core module (e.g. fs), false otherwise.
 */
export function isCoreModule(moduleName: string): boolean {
  return moduleName in nodeCoreLibs;
}

import { sync as browserResolveSync } from 'browser-resolve';
import * as nodeCoreLibs from 'node-libs-browser';
import { IPaeckchenContext } from './bundle';
import { SourceSpec } from './config';

interface IPackage {
  main: string;
  browser?: string;
  'jsnext:main'?: string;
}

function normalizePackageFactory(context: IPaeckchenContext): (pkg: IPackage) => IPackage {
  return function normalizePackage(pkg: IPackage): IPackage {
    // .browser, use package data as is
    if ('browser' in pkg) {
      return pkg;
    }

    // no .browser, .jsnext:main, use jsnext:main by aliasing to .main
    if (context.config.source !== SourceSpec.ES5 && 'jsnext:main' in pkg) {
      pkg.main = pkg['jsnext:main'];
      return pkg;
    }

    // use .main
    return pkg;
  };
}

/**
 * Return a resolved module path
 *
 * @param filename Path to file from where importPath is resolved
 * @param importIdentifier Identifier to resolve from filename
 * @param [context]
 * @return either the absolute path to the requested module or the name of a node core module
 * @throws when failing to resolve requested module
 */
export function getModulePath(filename: string, importIdentifier: string, context: IPaeckchenContext): string {
  return browserResolveSync(importIdentifier, {
    filename: filename,
    modules: nodeCoreLibs,
    packageFilter: normalizePackageFactory(context),
    readFileSync: (path: string): Buffer => new Buffer(context.host.readFile(path)),
    isFile: (filePath: string): boolean => context.host.fileExists(filePath) && context.host.isFile(filePath)
  });
}

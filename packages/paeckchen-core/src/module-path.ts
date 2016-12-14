import * as browserResolve from 'browser-resolve';
import * as nodeCoreLibs from 'node-libs-browser';

import { PaeckchenContext } from './bundle';
import { SourceSpec } from './config';

interface Package {
  main: string;
  browser?: string;
  'jsnext:main'?: string;
}

function normalizePackageFactory(context: PaeckchenContext): (pkg: Package) => Package {
  return function normalizePackage(pkg: Package): Package {
    // .browser, use package data as is
    if ('browser' in pkg) {
      return pkg;
    }

    // no .browser, .jsnext:main, use jsnext:main by aliasing to .main
    if (context.config.input.source !== SourceSpec.ES5 && 'jsnext:main' in pkg) {
      pkg.main = pkg['jsnext:main'] as string;
      return pkg;
    }

    // use .main
    return pkg;
  };
}

async function nodebackReadFile(context: PaeckchenContext, file: string,
    cb: (err: Error|null, file?: Buffer) => void): Promise<void> {
  try {
    const data = await context.host.readFile(file);
    cb(null, new Buffer(data));
  } catch (e) {
    cb(e);
  }
}

async function nodebackIsFile(context: PaeckchenContext, file: string,
    cb: (err: Error|null, isFile?: boolean) => void): Promise<void> {
  try {
    if (!context.host.fileExists(file)) {
      cb(null, false);
    } else {
      try {
        const isFile = await context.host.isFile(file);
        cb(null, isFile);
      } catch (e) {
        cb(e);
      }
    }
  } catch (e) {
    cb(e);
  }
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
export function getModulePath(filename: string, importIdentifier: string, context: PaeckchenContext): Promise<string> {
  return new Promise((resolve, reject) => {
    context.logger.trace('module-path', `getModulePath [filename=${filename}, importIdentifier=${importIdentifier}]`);

    if (importIdentifier in context.config.externals) {
      resolve(importIdentifier);
    }
    let importOrAliasIdentifier = importIdentifier;
    if (importIdentifier in context.config.aliases) {
      importOrAliasIdentifier = context.config.aliases[importIdentifier];
    }
    const opts = {
      filename,
      modules: nodeCoreLibs,
      packageFilter: normalizePackageFactory(context),
      readFile: (file: string, cb: (err: Error|undefined|null, file: Buffer|undefined|null) => void) =>
        nodebackReadFile(context, file, cb),
      isFile: (file: string, cb: (err: Error|undefined|null, isFile: boolean|undefined|null) => void) =>
        nodebackIsFile(context, file, cb)
    };
    browserResolve(importOrAliasIdentifier, opts, (err, resolved) => {
      if (err) {
        return reject(err);
      }
      resolve(resolved);
    });
  });
}

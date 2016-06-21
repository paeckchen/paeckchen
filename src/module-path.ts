import { IHost, DefaultHost } from './host';
import { sync as browserResolveSync } from 'browser-resolve';
import * as nodeCoreLibs from 'node-libs-browser';

/**
 * Return a resolved module path
 *
 * @param filename Path to file from where importPath is resolved
 * @param importIdentifier Identifier to resolve from filename
 * @param [host]
 */
export function getModulePath(filename: string, importIdentifier: string, host: IHost = new DefaultHost()): string {
  return browserResolveSync(importIdentifier, {
    filename: filename,
    modules: nodeCoreLibs,
    packageFilter: pkg => {
      // If the browser field is not defined, use jsnext:main instead
      if ('browser' in pkg === false && 'jsnext:main' in pkg) {
        pkg.browser = pkg['jsnext:main'];
      }

      return pkg;
    },
    readFileSync: path => new Buffer(host.readFile(path)),
    isFile: filePath => host.fileExists(filePath) && host.isFile(filePath)
  });
}

import { existsSync, readFileSync, writeFileSync, statSync } from 'fs';
import { join, dirname, sep } from 'path';

export interface IHost {
  pathSep: string;

  cwd(): string;
  fileExists(path: string): boolean;
  isFile(path: string): boolean;
  readFile(path: string): string;
  writeFile(path: string, content: string): void;
  joinPath(...paths: string[]): string;
  dirname(path: string): string;
}

export class DefaultHost implements IHost {
  public cwd(): string {
    return process.cwd();
  }

  public fileExists(path: string): boolean {
    return existsSync(path);
  }

  public isFile(path: string): boolean {
    return statSync(path).isFile();
  }

  public readFile(path: string): string {
    return readFileSync(path).toString();
  }

  public writeFile(path: string, content: string): void {
    writeFileSync(path, content);
  }

  public get pathSep(): string {
    return sep;
  }

  public joinPath(...paths: string[]): string {
    return join(...paths);
  }

  public dirname(path: string): string {
    return dirname(path);
  }
}

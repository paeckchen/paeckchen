import { existsSync, readFileSync, writeFileSync, statSync } from 'fs';

export interface IHost {
  cwd(): string;
  fileExists(path: string): boolean;
  isFile(path: string): boolean;
  readFile(path: string): string;
  writeFile(path: string, content: string): void;
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

}

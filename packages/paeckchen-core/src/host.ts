import { existsSync, readFile, writeFileSync, stat } from 'fs';

export interface Host {
  cwd(): string;
  fileExists(path: string): boolean;
  isFile(path: string): Promise<boolean>;
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): void;
}

export class DefaultHost implements Host {
  public cwd(): string {
    return process.cwd();
  }

  public fileExists(path: string): boolean {
    return existsSync(path);
  }

  public isFile(path: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      stat(path, (err, stats) => {
        if (err) {
          return reject(err);
        }
        resolve(stats.isFile());
      });
    });
  }

  public readFile(path: string): Promise<string> {
    return new Promise((resolve, reject) => {
        readFile(path, (err, data) => {
          if (err) {
            return reject(err);
          }
          resolve(data.toString());
        });
      });
  }

  public writeFile(path: string, content: string): void {
    writeFileSync(path, content);
  }

}

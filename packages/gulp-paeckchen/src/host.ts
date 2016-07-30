import { File } from 'gulp-util';
import { Host } from 'paeckchen-core';

export class GulpHost implements Host {

  private files: {[path: string]: File} = {};

  public addFile(file: File): void {
    this.files[file.path] = file;
  }

  public getFile(path: string): File | undefined {
    return this.files[path];
  }

  public cwd(): string {
    return process.cwd();
  }

  public fileExists(path: string): boolean {
    return path in this.files;
  }

  public isFile(path: string): Promise<boolean> {
    return Promise.resolve()
      .then(() => {
        return !this.files[path].isDirectory();
      });
  }

  public readFile(path: string): Promise<string> {
    return Promise.resolve()
      .then(() => {
        return this.files[path].contents.toString();
      });
  }

  public writeFile(path: string, content: string): void {
    this.files[path] = new File({
      path,
      contents: new Buffer(content)
    });
  }

  public getModificationTime(path: string): Promise<number> {
    return Promise.resolve()
      .then(() => {
        const file = this.files[path];
        return file.stat && file.stat.mtime ? file.stat.mtime.getTime() : -1;
      });
  }

}

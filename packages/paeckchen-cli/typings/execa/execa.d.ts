declare module 'execa' {
  import { ExecFileOptions, ChildProcess } from 'child_process';
  import { Readable } from 'stream';

  interface Thenable {
    then(handler: (result: ChildProcess) => any): this;
    catch(handler: (error: Error & {stdout: Readable; stderr: Readable}) => any): this;
  }

  function execa(file: string, arguments?: string[],
    options?: ExecFileOptions): ChildProcess & Thenable;
  namespace execa {
  }

  export = execa;
}

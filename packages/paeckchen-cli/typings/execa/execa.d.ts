declare module 'execa' {
  import { ExecFileOptions, ChildProcess } from 'child_process';
  import { Readable } from 'stream';

  function execa(file: string, arguments?: string[], options?: ExecFileOptions): execa.PromiseLike;
  namespace execa {

    interface PromiseLike {
      then(handler: (result: ChildProcess) => any): this;
      catch(handler: (error: Error & {stdout: Readable; stderr: Readable}) => any): this;
    }

  }

  export = execa;
}

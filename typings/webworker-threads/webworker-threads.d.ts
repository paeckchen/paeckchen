declare module 'webworker-threads' {
  namespace webworkerThreads {
    export function createPool(numberOfThreads: number): any;
  }

  export = webworkerThreads
}

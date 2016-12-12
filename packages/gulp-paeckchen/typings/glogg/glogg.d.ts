declare module 'glogg' {

  function getLogger(name: string): getLogger.Glogg;
  namespace getLogger {
    export interface Glogg {
      on(level: 'info', callback: (message: string) => void): void;
      removeAllListeners(): void;
    }
  }

  export = getLogger;

}

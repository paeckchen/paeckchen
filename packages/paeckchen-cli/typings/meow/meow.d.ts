declare module 'meow' {
  import * as minimist from 'minimist';

  function meow(options: string|string[]|meow.MeowOptions, minimistOptions?: minimist.Opts): meow.MeowResult;
  namespace meow {

    export interface MeowOptions {
      description?: string|boolean;
      help?: string|boolean;
      version?: string|boolean;
      pkg?: any;
      argv?: string[];
      inferType?: boolean;
    }

    export interface MeowResult {
      input: string[];
      flags: {[name: string]: any};
      pkg: any;
      help: string;
      showHelp(code: number): void;
    }

  }

  export = meow;
}

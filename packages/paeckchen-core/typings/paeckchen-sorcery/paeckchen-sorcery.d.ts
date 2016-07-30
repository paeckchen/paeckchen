declare module 'paeckchen-sorcery' {

  export interface SorceryOptions {
    content: {[file: string]: string};
    sourcemaps: {[file: string]: any};
  }

  export function loadSync(file: string, options?: SorceryOptions): SorceryChain;

  export interface SorceryChain {
    apply(): SorceryMap;
  }

  export interface SorceryMap {
    toString(): string;
    toUrl(): string;
  }
}

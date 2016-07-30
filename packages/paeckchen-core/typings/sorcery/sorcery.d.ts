declare module 'sorcery' {

  export interface SorceryOptions {
    content: {[file: string]: string};
    sourcemaps: {[file: string]: any};
  }

  export function loadSync(file: string, options?: SorceryOptions): SorceryChain;
  export function load(file: string, options?: SorceryOptions): Promise<SorceryChain>;

  export interface SorceryChain {
    apply(): SorceryMap;
  }

  export interface SorceryMap {
    toString(): string;
    toUrl(): string;
  }
}

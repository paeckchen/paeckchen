import { IBundleOptions, SourceOptions } from './bundle';
import { IHost } from './host';

export enum SourceSpec {
  ES5,
  ES2015
}

export enum Runtime {
  browser,
  node
}

export interface IConfig {
  input: {
    entryPoint: string|undefined;
    source: SourceSpec;
  };
  output: {
    folder: string;
    file: string|undefined;
    runtime: Runtime;
  };
  aliases: {[name: string]: string};
  externals: {[name: string]: string|boolean};
  watchMode: boolean;
}

function getSource(input: SourceOptions): SourceSpec {
  switch (input) {
    case 'es5':
    case 'ES5':
      return SourceSpec.ES5;
    case 'es6':
    case 'ES6':
    case 'es2015':
    case 'ES2015':
      return SourceSpec.ES2015;
  }
  throw new Error(`Invalid source option ${input}`);
}

function getRuntime(input: string): Runtime {
  switch (input) {
    case 'browser':
    case 'Browser':
    case 'BROWSER':
      return Runtime.browser;
    case 'node':
    case 'Node':
    case 'NODE':
      return Runtime.node;
  }
  throw new Error(`Invalid runtime ${input}`);
}

function processKeyValueOption<V>(list: string|string[]|undefined, config: {[key: string]: V}): {[key: string]: V} {
  let map = config || {} as {[key: string]: V};
  if (list && list.length > 0) {
    const split = (alias: string) => alias.split('=');
    const assign = (object: {[key: string]: V}, input: string) => {
      const [key, value] = split(input);
      // TODO: There should be some kind of type cohersion here
      object[key] = value as any;
      return object;
    };

    if (Array.isArray(list)) {
      map = list.reduce((all: {[key: string]: V}, alias: string) => assign(all, alias), map);
    } else {
      map = assign(map, list);
    }
  }
  return map;
}

export function createConfig(options: IBundleOptions, host: IHost): IConfig {
  const configPath = host.joinPath(host.cwd(), options.configFile || 'paeckchen.json');
  let configFile: any = {};
  if (host.fileExists(configPath)) {
    try {
      configFile = JSON.parse(host.readFile(configPath));
    } catch (e) {
      throw new Error(`Failed to read config file [file=${configPath}, message=${e.message}]`);
    }
  }

  return {
    input: {
      entryPoint: options.entryPoint || configFile.input && configFile.input.entry || undefined,
      source: getSource(options.source || configFile.input && configFile.input.source || 'es2015')
    },
    output: {
      folder: options.outputDirectory || configFile.output && configFile.output.folder || host.cwd(),
      file: options.outputFile || configFile.output && configFile.output.file || undefined,
      runtime: getRuntime(options.runtime || configFile.output && configFile.output.runtime || 'browser')
    },
    aliases: processKeyValueOption<string>(options.alias, configFile.aliases),
    externals: processKeyValueOption<string|boolean>(options.external, configFile.externals),
    watchMode: options.watchMode || configFile.watchMode || false
  };
}

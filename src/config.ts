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
    entryPoint: string;
    source: SourceSpec;
  };
  output: {
    folder: string;
    file: string;
    runtime: Runtime;
  };
  aliases: {[name: string]: string};
  watchMode: boolean;
}

function getSource(input: SourceOptions): SourceSpec {
  switch (input) {
    case 'es5':
      return SourceSpec.ES5;
    case 'es6':
    case 'es2015':
      return SourceSpec.ES2015;
  }
  throw new Error(`Invalid source option ${input}`);
}

function getRuntime(input: string): Runtime {
  switch (input) {
    case 'node':
      return Runtime.node;
    default:
      return Runtime.browser;
  }
}

function getAliases(list: string|string[], config: {[name: string]: string}): {[name: string]: string} {
  let aliases = config;
  if (list && list.length > 0) {
    const split = (alias: string) => alias.split('=');
    if (!aliases) {
      aliases = {};
    }
    if (Array.isArray(list)) {
      aliases = list.reduce((all: any, alias: string) => {
        const [key, path] = split(alias as string);
        all[key] = path;
        return all;
      }, aliases);
    } else {
      const [key, path] = split(list as string);
      aliases[key] = path;
    }
  }
  return aliases || undefined;
}

export function createConfig(options: IBundleOptions, host: IHost): IConfig {
  const config: IConfig = {} as any;

  const configPath = host.joinPath(host.cwd(), options.configFile || 'paeckchen.json');
  let configFile: any = {};
  if (host.fileExists(configPath)) {
    try {
      configFile = JSON.parse(host.readFile(configPath));
    } catch (e) {
      throw new Error(`Failed to read config file [file=${configPath}, message=${e.message}]`);
    }
  }

  config.input = {} as any;
  config.input.entryPoint = options.entryPoint || configFile.input && configFile.input.entry || undefined;
  config.input.source = getSource(options.source || configFile.input && configFile.input.source || 'es2015');
  config.output = undefined;
  config.output = {} as any;
  config.output.folder = options.outputDirectory || configFile.output && configFile.output.folder || host.cwd();
  config.output.file = options.outputFile || configFile.output && configFile.output.file || 'paeckchen.js';
  config.output.runtime = getRuntime(options.runtime || configFile.output && configFile.output.runtime);
  config.aliases = getAliases(options.alias, configFile.aliases);
  config.watchMode = options.watchMode || configFile.watchMode || false;

  return config;
}

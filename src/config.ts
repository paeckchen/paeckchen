import { IBundleOptions, SourceOptions } from './bundle';
import { IHost } from './host';

export enum SourceSpec {
  ES5,
  ES2015
};

export interface IConfig {
  entryPoint: string;
  source: SourceSpec;
  output: {
    folder: string;
    file: string;
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

  config.entryPoint = options.entryPoint || configFile.entry || undefined;
  config.source = getSource(options.source || configFile.source || 'es2015');
  config.output = undefined;
  if (options.outputDirectory || options.outputFile || configFile.output) {
    config.output = {} as any;
    config.output.folder = options.outputDirectory || config.output.folder || __dirname;
    config.output.file = options.outputFile || config.output.file || 'paeckchen.js';
  }
  config.aliases = getAliases(options.alias, configFile.aliases);
  config.watchMode = options.watchMode || configFile.watchMode || false;

  return config;
}

import { IBundleOptions, SourceOptions } from './bundle';
import { IHost } from './host';

export enum SourceSpec {
  ES5,
  ES2015
};

export interface IConfig {
  entryPoint: string;
  source: SourceSpec;
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

  config.entryPoint = options.entryPoint || configFile.entry;
  config.source = getSource(options.source || configFile.source || 'es2015');
  config.watchMode = options.watchMode || configFile.watchMode || false;

  return config;
}

import { join } from 'path';

import { BundleOptions, SourceOptions } from './bundle';
import { Host } from './host';

export enum SourceSpec {
  ES5,
  ES2015
}

export enum Runtime {
  browser,
  node
}

export enum LogLevel {
  default,
  debug,
  trace
}

export interface Config {
  input: {
    entryPoint: string|undefined;
    source: SourceSpec;
  };
  output: {
    folder: string;
    file: string|undefined;
    runtime: Runtime;
    sourceMap: boolean|'inline';
  };
  aliases: {[name: string]: string};
  externals: {[name: string]: string|boolean};
  watchMode: boolean;
  logLevel: LogLevel;
  debug: boolean;
}

function getSource(input: SourceOptions): SourceSpec {
  switch (input.toLowerCase()) {
    case 'es5':
      return SourceSpec.ES5;
    case 'es6':
    case 'es2015':
      return SourceSpec.ES2015;
  }
  throw new Error(`Invalid source option ${input}`);
}

function getRuntime(input: string): Runtime {
  switch (input.toLowerCase()) {
    case 'browser':
      return Runtime.browser;
    case 'node':
      return Runtime.node;
  }
  throw new Error(`Invalid runtime ${input}`);
}

function getLogLevel(input: string): LogLevel {
  switch (input.toLowerCase()) {
    case 'default':
      return LogLevel.default;
    case 'debug':
      return LogLevel.debug;
    case 'trace':
      return LogLevel.trace;
  }
  throw new Error(`Invalid logLevel ${input}`);
}

function getSourceMap(input: boolean|'inline'): boolean|'inline' {
  if (typeof input === 'boolean') {
    return input;
  }
  switch (input.toLowerCase()) {
    case 'true':
      return true;
    case 'false':
      return false;
    case 'inline':
      return 'inline';
  }
  throw new Error(`Invalid sourceMap ${input}`);
}

function processKeyValueOption<V>(list: string|string[]|undefined, config: {[key: string]: V}): {[key: string]: V} {
  let map = config || {} as {[key: string]: V};
  if (list && list.length > 0) {
    const split = (alias: string) => alias.split('=');
    const assign = (object: {[key: string]: V}, input: string) => {
      const [key, value] = split(input);
      // tslint:disable-next-line
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

function falseStringToBoolean<V>(input: {[key: string]: V}): {[key: string]: V} {
  return Object.keys(input).reduce((result, key) => {
    let value = input[key];
    if (typeof value === 'string' && ((value as any) as string).toLowerCase() === 'false') {
      value = false as any;
    }
    result[key] = value;
    return result;
  }, {});
}

export async function createConfig(options: BundleOptions, host: Host): Promise<Config> {
  let configFile: any = {};
  const configPath = join(host.cwd(), options.configFile || 'paeckchen.json');
  if (host.fileExists(configPath)) {
    try {
      const data = await host.readFile(configPath);
      configFile = JSON.parse(data);
    } catch (e) {
      throw new Error(`Failed to read config file [file=${configPath}, message=${e.message}]`);
    }
  }

  // tslint:disable-next-line cyclomatic-complexity
  return {
    input: {
      entryPoint: options.entryPoint || configFile.input && configFile.input.entry || undefined,
      source: getSource(options.source || configFile.input && configFile.input.source || 'es2015')
    },
    output: {
      folder: options.outputDirectory || configFile.output && configFile.output.folder || host.cwd(),
      file: options.outputFile || configFile.output && configFile.output.file || undefined,
      runtime: getRuntime(options.runtime || configFile.output && configFile.output.runtime || 'browser'),
      sourceMap: getSourceMap(options.sourceMap || configFile.output && configFile.output.sourceMap || false)
    },
    aliases: processKeyValueOption<string>(options.alias, configFile.aliases),
    externals: falseStringToBoolean(processKeyValueOption<string|boolean>(options.external, configFile.externals)),
    watchMode: options.watchMode || configFile.watchMode || false,
    logLevel: getLogLevel(options.logLevel || configFile.logLevel || 'default'),
    debug: options.debug || configFile.debug || false
  };
}

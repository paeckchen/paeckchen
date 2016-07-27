import * as meow from 'meow';
import { BundleOptions } from 'paeckchen-core';
import { CliLogger } from './cli-logger';

export function createOptions(argv: string[]): BundleOptions {
  const cli = meow({
    argv,
    help: `
      Usage
        $ paeckchen <options>

      Options
        --config, -c
              paeckchen config file to use
              defaults to paeckchen.json in your current working directory

        --entry, -e
              entry point of the bundle to create

        --source, -s
              ecmascript source level (one of es5, es6, es2015)
              defaults to es2015

        --runtime, -r
              execution environment for the result bundle (browser, node)
              defaults to browser

        --out-dir, -o
              output folder of the bundle
              defaults to the current working directory

        --out-file, -f
              the file name of the bundle
              if undefined the bundle is printed to stdout

        --alias, -a
              module/dependency aliases
              defined as key value pairs separated by '='
              could be given multiple times

              Example:
                -a 'fs=fs-extra'

        --external
              external/global modules realtive to the bundle
              defined as key value pairs separated by '='
              if the right hand side is 'false' the module will be ignored
              could be given multiple times

              Example:
                --external 'jQuery=$'
                --external 'fs=false'

        --watch, -w
              enables watch mode

        --source-map [true|false|inline]
              enables generation of source-map

        --loglevel <level>, -v
              sets the log output level. Can be 'default', 'debug' or 'trace'
              '-v' means debug

        --debug, -d
              starts paeckchen in debug mode which enables caching

    `
  }, {
      string: [
        'config',
        'entry',
        'source',
        'runtime',
        'out-dir',
        'out-file',
        'alias',
        'external',
        'loglevel',
        'source-map'
      ],
      boolean: ['watch', 'v', 'debug'],
      alias: {
        h: 'help',
        c: 'config',
        e: 'entry',
        s: 'source',
        r: 'runtime',
        o: 'out-dir',
        f: 'out-file',
        a: 'alias',
        w: 'watch',
        d: 'debug'
      }
    });

  return {
    configFile: cli.flags['config'],
    entryPoint: cli.flags['entry'],
    source: cli.flags['source'],
    outputDirectory: cli.flags['outDir'],
    outputFile: cli.flags['outFile'],
    runtime: cli.flags['runtime'],
    alias: cli.flags['alias'],
    external: cli.flags['external'],
    watchMode: cli.flags['watch'],
    logger: new CliLogger(),
    sourceMap: cli.flags['sourceMap'] || false,
    logLevel: cli.flags['loglevel'] || (cli.flags['v'] ? 'debug' : undefined),
    debug: cli.flags['debug'] || false
  };
}

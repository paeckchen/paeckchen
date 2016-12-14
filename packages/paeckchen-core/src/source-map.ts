import { loadSync as sorceryLoadSync } from 'paeckchen-sorcery';
import { relative } from 'path';

import { PaeckchenContext } from './bundle';
import { State } from './state';

async function readFiles(context: PaeckchenContext, files: string[], suffix: string): Promise<(string|undefined)[]> {
  return await Promise.all(files.map(async path => {
    try {
      return context.host.readFile(`${path}${suffix}`);
    } catch (e) {
      return undefined;
    }
  }));
}

async function readSourcesAndMaps(context: PaeckchenContext, files: string[]):
    Promise<{sources: (string|undefined)[], maps: (string|undefined)[]}> {
  const sources = await readFiles(context, files, '');
  const maps = await readFiles(context, files, '.map');
  return {
    sources,
    maps
  };
}

function listToObject<T>(list: string[], fn: (index: number) => T): {[path: string]: T} {
  return list.reduce((map, entry, index) => {
    const result = fn(index);
    if (result) {
      map[entry] = result;
    }
    return map;
  }, {});
}

export async function generateSourceMap(state: State, context: PaeckchenContext,
    input: {code: string; map: any}): Promise<string> {
  const files = Object.keys(state.wrappedModules);
  const {sources, maps} = await readSourcesAndMaps(context, files);
  const content = listToObject(files, index => sources[index]!);
  const outputFileName = context.config.output.file || 'paeckchen.js';
  content[outputFileName] = input.code;
  const sourcemaps = listToObject(files, index => maps[index] ? JSON.parse(maps[index]!) : undefined);
  sourcemaps[outputFileName] = JSON.parse(input.map.toString());

  const chain = sorceryLoadSync(outputFileName, { content, sourcemaps });
  const map = JSON.parse(chain.apply().toString());
  // rewrite sources relative to host.cwd
  map.sources = map.sources.map((file: string) => relative(context.host.cwd(), file));
  return JSON.stringify(map);
}

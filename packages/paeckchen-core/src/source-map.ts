import { loadSync as sorceryLoadSync } from 'paeckchen-sorcery';
import { relative } from 'path';

import { PaeckchenContext } from './bundle';
import { State } from './state';

function readSourcesAndMaps(context: PaeckchenContext, files: string[]): Promise<{sources: string[], maps: string[]}> {
  return Promise.all(files.map(path => context.host.readFile(path).catch(err => undefined)))
    .then(contents => {
      return Promise.all(files.map(path => context.host.readFile(path + '.map').catch(err => undefined)))
        .then(maps => {
          return {sources: contents, maps};
        });
    });
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

export function generateSourceMap(state: State, context: PaeckchenContext,
    input: {code: string; map: any}): Promise<string> {
  const files = Object.keys(state.wrappedModules);
  return readSourcesAndMaps(context, files)
    .then(({sources, maps}) => {
      const content = listToObject(files, index => sources[index]);
      const outputFileName = context.config.output.file || 'paeckchen.js';
      content[outputFileName] = input.code;
      const sourcemaps = listToObject(files, index => maps[index] ? JSON.parse(maps[index]) : undefined);
      sourcemaps[outputFileName] = JSON.parse(input.map.toString());

      const chain = sorceryLoadSync(outputFileName, { content, sourcemaps });
      const map = JSON.parse(chain.apply().toString());
      // rewrite sources relative to host.cwd
      map.sources = map.sources.map((file: string) => relative(context.host.cwd(), file));
      return JSON.stringify(map);
    });
}

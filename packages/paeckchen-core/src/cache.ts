import * as ESTree from 'estree';
import { join } from 'path';
import { PaeckchenContext } from './bundle';
import { State } from './state';

export interface Cache {
  paeckchenAst: ESTree.Program;
  state: any;
}

function getCachePath(context: PaeckchenContext): string {
  return join(context.host.cwd(), 'paeckchen.cache.json');
}

export function readCache(context: PaeckchenContext): Promise<Cache> {
  if (!context.config.debug || !context.host.fileExists(getCachePath(context))) {
    return Promise.resolve({});
  }
  return context.host.readFile(getCachePath(context))
    .then(data => JSON.parse(data));
}

export function updateCache(context: PaeckchenContext, paeckchenAst: ESTree.Program, state: State): void {
  const cache: Cache = {
    paeckchenAst,
    state: state.save()
  };
  context.host.writeFile(getCachePath(context), JSON.stringify(cache));
}

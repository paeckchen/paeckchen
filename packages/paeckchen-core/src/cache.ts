import * as ESTree from 'estree';
import { join } from 'path';
import { PaeckchenContext } from './bundle';
import { State } from './state';

export interface Cache {
  paeckchenAst?: ESTree.Program;
  state?: any;
}

function getCachePath(context: PaeckchenContext): string {
  return join(context.host.cwd(), 'paeckchen.cache.json');
}

export async function readCache(context: PaeckchenContext): Promise<Cache> {
  if (!context.config.debug || !context.host.fileExists(getCachePath(context))) {
    return {};
  }
  return JSON.parse(await context.host.readFile(getCachePath(context)));
}

export function updateCache(context: PaeckchenContext, paeckchenAst: ESTree.Program, state: State): void {
  const cache: Cache = {
    paeckchenAst,
    state: state.save()
  };
  context.host.writeFile(getCachePath(context), JSON.stringify(cache));
}

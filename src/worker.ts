import { DefaultHost } from './host';
import { createConfig } from './config';
import { processModule } from './modules';
import * as plugins from './plugins';
import { IPaeckchenContext } from './bundle';
import { IDetectedGlobals } from './globals';

interface IWorkerPaeckchenContext extends IPaeckchenContext {
  configured: boolean;
}

const context = <IWorkerPaeckchenContext> {
  configured: false
};

const log = (...args: any[]) => {
  console.log(process.pid, ...args);
};

process.on('message', ({ type, data, id}) => {
  log(type, data, id);

  const respond = (_type?: string, _data?: any) => {
    process.send({ id, type: _type, data: _data });
  };

  switch (type) {
    case 'configure':
      const host = new DefaultHost();

      context.config = createConfig(data, host);
      context.host = host;
      context.configured = true;

      respond();
      break;

    case 'processFile':
      if (context.configured === false) {
        log('not yet configured!');
      }
      const globals = <IDetectedGlobals> {};
      const ast = processModule(data, context, globals, plugins);

      respond('processedFile', { globals, ast, path: data });
      break;

    default:
      log('what?', { type, data, id });
  }

});

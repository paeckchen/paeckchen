function fibonacci(n) {
   return n < 1 ? 0
        : n <= 2 ? 1
        : fibonacci(n - 1) + fibonacci(n - 2);
}

process.on('message', payload => {
  console.log(process.pid);
  console.log('worker received payload for', payload.type, 'bouncing back');
  
  fibonacci(43);
  process.send(payload);
});

/* import * as Promise from 'bluebird';
import { bundleNextModule } from './modules';
import { DefaultHost } from './host';
import { createConfig } from './config';

const notConfiguredError = 'context needs to be configured before sending processing requests';

function main() {
  // Wrap procedure into promise to get basic error handling back.
  return new Promise((_, reject) => {
    const context = {
      configured: false
    };

    // Configure paeckchen context
    thread.on('configure', (optionsJson) => {
      const host = new DefaultHost();
      const options = JSON.parse(optionsJson);

      context.config = createConfig(options, host);
      context.host = host;
      context.configured = true;
    });

    // Handle incoming processing requests
    thread.on('processFile', (modulePath) => {
      if (context.configured === false) {
        reject(new Error(notConfiguredError));
      }
      console.log(modulePath);
    });

  });
}

function barf(errorData) {
  thread.emit('error', JSON.stringify({
    message: error.message,
    stack: error.stack,
    id: thread.id
  }));
}

try {
  main()
    .catch(barf);
} catch (error) {
  barf(error);
} */
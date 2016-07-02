import { bundleNextModule } from './modules';

console.log(thread.id);

thread.on('processFile', (path) => {
  console.log('processing file', path);


  try {
    setTimeout(() => {
      thread.emit('processedFile', 'a');
    }, 1000);
  } catch (error) {
    thread.emit('error', JSON.stringify({
      message: error.message,
      stack: error.stack,
      id: thread.id
    }));
  }
});

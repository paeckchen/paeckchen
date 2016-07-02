import {fork, ChildProcess} from 'child_process';

export interface IForkOptions {
  cwd?: string;
  env?: {[envname: string]: string};
  execPath?: string;
  execArgv?: string[];
  silent?: boolean;
  uid?: number;
  gid?: number;
}

export interface IPool {
  /* Send event of type with payload of data to all workers in pool */
  all(type: string, data?: any): IPool;

  /* Send event of type with payload of data to any idle **one** worker in pool */
  any(type: string, data?: any): IPool;

  /* Kill all workers */
  destroy(): IPool;

  /* Listen on emitted events from all workers in pool */
  on(type: string, listener: (data?: any) => void): IPool;
}

interface IWorker {
  tasks: number[];
  child: ChildProcess;
}

let messageIndex = 0;

function send(worker: IWorker, type: string, data: any): void {
  messageIndex = messageIndex + 1;
  worker.tasks.push(messageIndex);
  worker.child.send({type, data, id: messageIndex});
}

export default function createPool(headCount: number, modulePath: string, forkOptions?: IForkOptions): IPool {
  const receivers: {[messageType: string]: Function[]} = {};
  const queue: any[] = [];

  const workers: IWorker[] = Array.from({length: headCount}).map(() => {
    return <IWorker>{
      tasks: [],
      child: fork(modulePath, [], forkOptions)
    };
  });

  workers.forEach(worker => worker.child.on('message', ({type, data, id}) => {
    const index = worker.tasks.indexOf(id);
    if (index > -1) {
      worker.tasks.splice(index, 1);
    }
    if (worker.tasks.length === 0 && queue.length > 0) {
      const {type, data} = queue.shift();
      send(worker, type, data);
    }
    const typeReceivers = receivers[type] || [];
    typeReceivers.forEach(receiver => receiver(data));
  }));

  return {
    all(type, data) {
      workers.forEach(worker => {
        send(worker, type, data);
      })
      return this;
    },
    any(type, data) {
      const candidate = workers.filter(worker => worker.tasks.length === 0)[0];

      if (candidate) {
        send(candidate, type, data);
        return this;
      }

      queue.push({type, data});
      return this;
    },
    destroy() {
      workers.forEach(worker => worker.child.kill('SIGKILL'));
      return this;
    },
    on(messageType, listener) {
      const typeReceivers = receivers[messageType] || [];
      if (typeReceivers.indexOf(listener) === -1) {
        receivers[messageType] = typeReceivers.concat(listener);
      }
      return this;
    }
  };
}
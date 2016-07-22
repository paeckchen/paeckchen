import { debuglog } from 'util';
import { terminal } from 'terminal-kit';
import { Logger } from 'paeckchen-core';

interface NodeLogger {
  (message: string, ...params: any[]): void;
}

export class CliLogger implements Logger {


  private loggers: {[section: string]: NodeLogger} = {};

  private getLogger(section: string): NodeLogger {
    if (!(section in this.loggers)) {
      this.loggers[section] = debuglog(section);
    }
    return this.loggers[section];
  }

  public trace(section: string, message: string): void {
    this.getLogger(section)(`TRACE ${message}`);
  }

  public debug(section: string, message: string): void {
    this.getLogger(section)(`DEBUG ${message}`);
  }

  public info(section: string, message: string): void {
    this.getLogger(section)(`INFO ${message}`);
  }

  public error(section: string, error: Error, message: string): void {
    this.getLogger(section)(`ERROR ${message}\n${error.message}`);
  }

  public progress(current: number, total: number): void {
    const percent = Math.min(100, Math.ceil(total * 100 / (current + total)));
    terminal.column(1)
      .eraseLineAfter()
      .green.error(`${percent}% `)
      .brightBlack.error(`[${current}|${current + total}]`);
    // TODO: Change this once we have progress states
    if (current === 0 && percent === 100) {
      process.stderr.write('\n');
    }
  }

}

import * as debug from 'debug';
import { terminal } from 'terminal-kit';
import { ProgressStep, Logger, Config, LogLevel } from 'paeckchen-core';

export class CliLogger implements Logger {

  private loggers: {[section: string]: debug.IDebugger} = {};

  private enabledTrace: boolean = false;
  private enabledDebug: boolean = false;

  private progressStep: ProgressStep;
  private progressCurrent: number;
  private progressTotal: number;

  public configure(config: Config): void {
    this.enabledTrace = config.logLevel === LogLevel.trace;
    this.enabledDebug = config.logLevel === LogLevel.debug || this.enabledTrace;
  }

  private getLogger(section: string): debug.IDebugger {
    if (!(section in this.loggers)) {
      debug.enable(section);
      this.loggers[section] = debug(section);
    }
    return this.loggers[section];
  }

  public trace(section: string, message: string): void {
    if (this.enabledTrace) {
      this.getLogger(section)(`${terminal.str.bold.dim('TRACE')} ${message}`);
      this.updateProgress(false);
    }
  }

  public debug(section: string, message: string): void {
    if (this.enabledDebug) {
      this.getLogger(section)(`${terminal.str.bold.brightYellow('DEBUG')} ${message}`);
      this.updateProgress(false);
    }
  }

  public info(section: string, message: string): void {
    this.getLogger(section)(`${terminal.str.bold.white('INFO')} ${message}`);
    this.updateProgress(false);
  }

  public error(section: string, error: Error, message: string): void {
    this.getLogger(section)(`${terminal.str.bold.red('ERROR')} ${message}\n${error.message}`);
    this.updateProgress(false);
  }

  public progress(step: ProgressStep, current: number, total: number): void {
    this.progressStep = step;
    this.progressCurrent = current;
    this.progressTotal = total;
    this.updateProgress(true);
  }

  private updateProgress(fromProgress: boolean): void {
    const percent = Math.min(100, Math.ceil(this.progressTotal * 100 / (this.progressCurrent + this.progressTotal)));
    switch (this.progressStep) {
      case ProgressStep.init:
        terminal
          .error.hideCursor(true);
        break;
      case ProgressStep.bundleModules:
      case ProgressStep.bundleGlobals:
      case ProgressStep.generateBundle:
        if (!fromProgress) {
          terminal
            .error.nextLine(1);
        }
        terminal
          .error.eraseLineAfter()
          .error.brightGreen(`${percent}% `)
          .error.brightBlack(`[${this.progressCurrent}|${this.progressCurrent + this.progressTotal}]`)
          .error.column(1);
        break;
      case ProgressStep.end:
        terminal
          .error.nextLine(1)
          .error.hideCursor(false);
        break;
    }
  }

}

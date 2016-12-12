import * as debug from 'debug';
import { ProgressStep, Logger, Config, LogLevel } from 'paeckchen-core';
import { terminal } from 'terminal-kit';

const progressStepNames: {[step: number]: string} = {
  [ProgressStep.init]: 'initializing',
  [ProgressStep.bundleModules]: 'bundle modules',
  [ProgressStep.bundleGlobals]: 'bundle globals',
  [ProgressStep.generateBundle]: 'create paeckchen',
  [ProgressStep.generateSourceMap]: 'create source-map'
};

export class CliLogger implements Logger {

  private loggers: {[section: string]: debug.IDebugger} = {};

  private enabledTrace: boolean = false;
  private enabledDebug: boolean = false;

  private progressStep: ProgressStep | undefined;
  private progressCurrent: number;
  private progressTotal: number;

  private startTime: number;
  private endTime: number;

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
    this.getLogger(section)(`${terminal.str.bold.red('ERROR')} ${message}\n${error.stack}`);
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
    // tslint:disable-next-line:cyclomatic-complexity
    switch (this.progressStep) {
      case ProgressStep.init:
        this.startTime = new Date().getTime();
        terminal
          .error.hideCursor(true)
          .error.nextLine(1);
        this.outputProgress(percent);
        break;
      case ProgressStep.bundleModules:
      case ProgressStep.bundleGlobals:
      case ProgressStep.generateBundle:
      case ProgressStep.generateSourceMap:
        if (!fromProgress) {
          terminal
            .error.nextLine(1);
        }
        this.outputProgress(percent);
        break;
      case ProgressStep.end:
        // reset progressStep to get around loops
        this.progressStep = undefined;
        this.endTime = new Date().getTime();
        this.info('cli', `Bundeling took ${(this.endTime - this.startTime) / 1000}s`);
        this.reset();
        break;
    }
  }

  private outputProgress(percent: number): void {
    terminal
      .error.eraseLineAfter()
      .error.brightGreen(`${percent}% `)
      .error.brightBlack(`[${this.progressCurrent}|${this.progressCurrent + this.progressTotal}]`)
      .error.brightBlack(` ${progressStepNames[this.progressStep as number]}`)
      .error.column(1);
  }

  public reset(): void {
    terminal
      .error.nextLine(1)
      .error.hideCursor(false);
  }

}

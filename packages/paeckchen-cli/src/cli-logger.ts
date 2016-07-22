import * as debug from 'debug';
import { terminal } from 'terminal-kit';
import { ProgressStep, Logger } from 'paeckchen-core';

export class CliLogger implements Logger {

  private loggers: {[section: string]: debug.IDebugger} = {};

  private lastWasProgress: boolean = false;
  private progressStep: ProgressStep;
  private progressCurrent: number;
  private progressTotal: number;

  private getLogger(section: string): debug.IDebugger {
    if (!(section in this.loggers)) {
      this.loggers[section] = debug(section);
    }
    return this.loggers[section];
  }

  private clearProgress(): void {
    if (this.lastWasProgress) {
      terminal
        .error.column(1)
        .error.eraseLineAfter();
    }
  }

  public trace(section: string, message: string): void {
    this.clearProgress();
    this.getLogger(section)(`${terminal.str.bold.dim('TRACE')} ${message}`);
    this.lastWasProgress = false;
    this.updateProgress();
  }

  public debug(section: string, message: string): void {
    this.clearProgress();
    this.getLogger(section)(`${terminal.str.bold.brightYellow('DEBUG')} ${message}`);
    this.lastWasProgress = false;
    this.updateProgress();
  }

  public info(section: string, message: string): void {
    this.clearProgress();
    this.getLogger(section)(`${terminal.str.bold.white('INFO')} ${message}`);
    this.lastWasProgress = false;
    this.updateProgress();
  }

  public error(section: string, error: Error, message: string): void {
    this.clearProgress();
    this.getLogger(section)(`${terminal.str.bold.red('ERROR')} ${message}\n${error.message}`);
    this.lastWasProgress = false;
    this.updateProgress();
  }

  public progress(step: ProgressStep, current: number, total: number): void {
    this.progressStep = step;
    this.progressCurrent = current;
    this.progressTotal = total;
    this.updateProgress();
  }

  private updateProgress(): void {
    const percent = Math.min(100, Math.ceil(this.progressTotal * 100 / (this.progressCurrent + this.progressTotal)));
    switch (this.progressStep) {
      case ProgressStep.init:
        terminal
          .error.hideCursor(true);
        break;
      case ProgressStep.bundleModules:
      case ProgressStep.bundleGlobals:
      case ProgressStep.generateBundle:
        if (!this.lastWasProgress) {
          terminal
            .error.nextLine(1);
        }
        terminal
          .error.column(1)
          .error.eraseLineAfter()
          .error.brightGreen(`${percent}% `)
          .error.brightBlack(`[${this.progressCurrent}|${this.progressCurrent + this.progressTotal}]`);
        break;
      case ProgressStep.end:
        terminal
          .error.nextLine(1)
          .error.hideCursor(false);
        break;
    }
    this.lastWasProgress = true;
  }

}

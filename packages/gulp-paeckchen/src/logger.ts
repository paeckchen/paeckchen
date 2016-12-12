import { log, colors } from 'gulp-util';
import { LogLevel, Logger, Config, ProgressStep } from 'paeckchen-core';

export class GulpLogger implements Logger {

  private enabledTrace: boolean = false;
  private enabledDebug: boolean = false;

  public configure(config: Config): void {
    this.enabledTrace = config.logLevel === LogLevel.trace;
    this.enabledDebug = config.logLevel === LogLevel.debug || this.enabledTrace;
  }

  public trace(section: string, message: string): void {
    if (this.enabledTrace) {
      log(`${section} ${colors.grey('TRACE')} ${message}`);
    }
  }

  public debug(section: string, message: string): void {
    if (this.enabledDebug) {
      log(`${section} ${colors.yellow('DEBUG')} ${message}`);
    }
  }

  public info(section: string, message: string): void {
    log(`${section} ${colors.white('INFO')} ${message}`);
  }

  public error(section: string, error: Error, message: string): void {
    log(`${section} ${colors.red('ERROR')} ${message}: ${error}`);
  }

  public progress(step: ProgressStep, current: number, total: number): void {
    // todo
  }

}

import { Config } from './config';

export enum ProgressStep {
  init = 0,
  bundleModules = 20,
  bundleGlobals = 80,
  generateBundle = 90,
  generateSourceMap = 95,
  end = 100
}

export interface Logger {

  configure(config: Config): void;

  trace(section: string, message: string, ...params: any[]): void;

  debug(section: string, message: string, ...params: any[]): void;

  info(section: string, message: string, ...params: any[]): void;

  error(section: string, error: Error, message: string, ...params: any[]): void;

  progress(step: ProgressStep, current: number, total: number): void;

}

export class NoopLogger implements Logger {

  public configure(config: Config): void {
    // noop
  }

  public trace(section: string, message: string): void {
    // noop
  }

  public debug(section: string, message: string): void {
    // noop
  }

  public info(section: string, message: string): void {
    // noop
  }

  public error(section: string, error: Error, message: string): void {
    // noop
  }

  public progress(step: ProgressStep, current: number, total: number): void {
    // noop
  }

}

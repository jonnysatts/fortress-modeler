import { ILogService, LogLevel } from '../interfaces/ILogService';

/**
 * Console-based logging service implementation
 * Provides structured logging with configurable levels
 */
export class LogService implements ILogService {
  private currentLevel: LogLevel = 'info';
  private readonly levels: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  };

  constructor(initialLevel: LogLevel = 'info') {
    this.currentLevel = initialLevel;
  }

  debug(message: string, data?: any): void {
    if (this.shouldLog('debug')) {
      console.debug(`[DEBUG] ${this.formatMessage(message)}`, data || '');
    }
  }

  info(message: string, data?: any): void {
    if (this.shouldLog('info')) {
      console.info(`[INFO] ${this.formatMessage(message)}`, data || '');
    }
  }

  warn(message: string, data?: any): void {
    if (this.shouldLog('warn')) {
      console.warn(`[WARN] ${this.formatMessage(message)}`, data || '');
    }
  }

  error(message: string, error?: Error | unknown, data?: any): void {
    if (this.shouldLog('error')) {
      const errorInfo = error instanceof Error ? error.stack : String(error);
      console.error(`[ERROR] ${this.formatMessage(message)}`, {
        error: errorInfo,
        data: data || {},
      });
    }
  }

  setLevel(level: LogLevel): void {
    this.currentLevel = level;
  }

  getLevel(): LogLevel {
    return this.currentLevel;
  }

  private shouldLog(level: LogLevel): boolean {
    return this.levels[level] >= this.levels[this.currentLevel];
  }

  private formatMessage(message: string): string {
    const timestamp = new Date().toISOString();
    return `${timestamp} - ${message}`;
  }
}
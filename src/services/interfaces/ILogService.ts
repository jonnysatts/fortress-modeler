/**
 * Logging service interface for structured application logging
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface ILogService {
  /**
   * Log a debug message (development only)
   */
  debug(message: string, data?: any): void;

  /**
   * Log an informational message
   */
  info(message: string, data?: any): void;

  /**
   * Log a warning message
   */
  warn(message: string, data?: any): void;

  /**
   * Log an error message
   */
  error(message: string, error?: Error | unknown, data?: any): void;

  /**
   * Set the minimum log level
   */
  setLevel(level: LogLevel): void;

  /**
   * Get the current log level
   */
  getLevel(): LogLevel;
}
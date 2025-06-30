/**
 * Error service interface for centralized error handling and reporting
 */

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';
export type ErrorCategory = 'network' | 'validation' | 'runtime' | 'database' | 'authentication' | 'unknown';

export interface ErrorContext {
  userId?: string;
  sessionId?: string;
  url?: string;
  userAgent?: string;
  timestamp?: Date;
  metadata?: Record<string, any>;
}

export interface IErrorService {
  /**
   * Log an error with context information and categorization
   */
  logError(
    error: Error | unknown, 
    context?: string, 
    category?: ErrorCategory,
    severity?: ErrorSeverity,
    metadata?: Record<string, any>
  ): void;

  /**
   * Show a user-friendly error message
   */
  showErrorToUser(message: string, description?: string): void;

  /**
   * Show a success message to user
   */
  showSuccessToUser(message: string, description?: string): void;

  /**
   * Show a warning message to user
   */
  showWarningToUser(message: string, description?: string): void;

  /**
   * Handle and report critical errors with automatic recovery attempts
   */
  handleCriticalError(error: Error | unknown, context: string, recoveryAction?: () => void): void;

  /**
   * Handle network errors with retry logic
   */
  handleNetworkError(error: Error | unknown, context: string, retryFn?: () => Promise<any>): Promise<void>;

  /**
   * Handle validation errors for forms
   */
  handleValidationError(errors: Record<string, string>, context?: string): void;

  /**
   * Get a user-friendly error message from an error object
   */
  getErrorMessage(error: Error | unknown): string;

  /**
   * Report error to remote service (for production)
   */
  reportError(error: Error | unknown, context: ErrorContext): Promise<void>;

  /**
   * Clear all current error notifications
   */
  clearErrors(): void;

  /**
   * Check if an error should trigger a retry
   */
  shouldRetry(error: Error | unknown): boolean;

  /**
   * Get error category from error object
   */
  categorizeError(error: Error | unknown): ErrorCategory;
}
import { serviceContainer, SERVICE_TOKENS } from '../container/ServiceContainer';
import { IErrorService } from '../interfaces/IErrorService';
import { ILogService } from '../interfaces/ILogService';

/**
 * Global error handler for unhandled errors and promise rejections
 * Integrates with the error service for consistent error handling
 */
export class GlobalErrorHandler {
  private errorService: IErrorService;
  private logService: ILogService;
  private isInitialized = false;

  constructor() {
    this.errorService = serviceContainer.resolve<IErrorService>(SERVICE_TOKENS.ERROR_SERVICE);
    this.logService = serviceContainer.resolve<ILogService>(SERVICE_TOKENS.LOG_SERVICE);
  }

  /**
   * Initialize global error handlers
   * Should be called once during application startup
   */
  public initialize(): void {
    if (this.isInitialized) {
      return;
    }

    this.setupWindowErrorHandler();
    this.setupUnhandledPromiseRejectionHandler();
    this.setupConsoleErrorInterceptor();
    
    this.isInitialized = true;
    this.logService.info('Global error handlers initialized');
  }

  /**
   * Remove global error handlers
   * Useful for testing or cleanup
   */
  public cleanup(): void {
    if (!this.isInitialized) {
      return;
    }

    window.removeEventListener('error', this.handleWindowError);
    window.removeEventListener('unhandledrejection', this.handleUnhandledRejection);
    
    this.isInitialized = false;
    this.logService.info('Global error handlers cleaned up');
  }

  /**
   * Handle uncaught JavaScript errors
   */
  private setupWindowErrorHandler(): void {
    window.addEventListener('error', this.handleWindowError);
  }

  /**
   * Handle unhandled promise rejections
   */
  private setupUnhandledPromiseRejectionHandler(): void {
    window.addEventListener('unhandledrejection', this.handleUnhandledRejection);
  }

  /**
   * Intercept console.error calls for additional tracking
   */
  private setupConsoleErrorInterceptor(): void {
    const originalConsoleError = console.error;
    
    console.error = (...args: any[]) => {
      // Call original console.error first
      originalConsoleError.apply(console, args);
      
      // Track console errors that might be missed
      if (args.length > 0) {
        const errorMessage = args.map(arg => 
          typeof arg === 'string' ? arg : JSON.stringify(arg)
        ).join(' ');
        
        this.errorService.logError(
          new Error(errorMessage),
          'console.error',
          'runtime',
          'low',
          { consoleArgs: args }
        );
      }
    };
  }

  private handleWindowError = (event: ErrorEvent): void => {
    const error = event.error || new Error(event.message);
    
    this.errorService.logError(
      error,
      'window.onerror',
      'runtime',
      'high',
      {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        type: 'uncaught-exception',
      }
    );

    // Don't prevent default behavior - let the browser handle it too
    return false;
  };

  private handleUnhandledRejection = (event: PromiseRejectionEvent): void => {
    const error = event.reason instanceof Error 
      ? event.reason 
      : new Error(String(event.reason));

    this.errorService.logError(
      error,
      'unhandledrejection',
      'runtime',
      'high',
      {
        type: 'unhandled-promise-rejection',
        reason: event.reason,
      }
    );

    // Prevent the default browser behavior (logging to console)
    // since we're handling it ourselves
    event.preventDefault();
  };
}

// Export singleton instance
export const globalErrorHandler = new GlobalErrorHandler();
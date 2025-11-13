import { serviceContainer, SERVICE_TOKENS } from '../container/ServiceContainer';
import { IErrorService } from '../interfaces/IErrorService';
import { ILogService } from '../interfaces/ILogService';

/**
 * Global error handler for unhandled errors and promise rejections
 * Integrates with the error service for consistent error handling
 */
export class GlobalErrorHandler {
  private errorService: IErrorService | null = null;
  private logService: ILogService | null = null;
  private isInitialized = false;

  constructor() {
    // Don't resolve services in constructor - wait for initialize()
  }

  /**
   * Initialize global error handlers
   * Should be called once during application startup
   */
  public initialize(): void {
    if (this.isInitialized) {
      return;
    }

    // Safely resolve services when initialize is called
    try {
      this.errorService = serviceContainer.resolve<IErrorService>(SERVICE_TOKENS.ERROR_SERVICE);
      this.logService = serviceContainer.resolve<ILogService>(SERVICE_TOKENS.LOG_SERVICE);
    } catch (error) {
      console.error('❌ Failed to resolve services in GlobalErrorHandler:', error);
      // Continue without services rather than failing completely
      this.errorService = null;
      this.logService = null;
    }

    this.setupWindowErrorHandler();
    this.setupUnhandledPromiseRejectionHandler();
    this.setupConsoleErrorInterceptor();
    
    this.isInitialized = true;
    
    if (this.logService) {
      this.logService.info('Global error handlers initialized');
    } else {
      console.log('✅ Global error handlers initialized (without service integration)');
    }
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
        
        this.errorService?.logError(
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
    
    if (this.errorService) {
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
    } else {
      console.error('Global Window Error:', error, {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        type: 'uncaught-exception',
      });
    }

    // Don't prevent default behavior - let the browser handle it too
    return false;
  };

  private handleUnhandledRejection = (event: PromiseRejectionEvent): void => {
    const error = event.reason instanceof Error 
      ? event.reason 
      : new Error(String(event.reason));

    if (this.errorService) {
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
    } else {
      console.error('Global Unhandled Promise Rejection:', error, {
        type: 'unhandled-promise-rejection',
        reason: event.reason,
      });
    }

    // Prevent the default browser behavior (logging to console)
    // since we're handling it ourselves
    event.preventDefault();
  };
}

// Export singleton instance - will be created after services are bootstrapped
let _globalErrorHandler: GlobalErrorHandler | null = null;

export const getGlobalErrorHandler = (): GlobalErrorHandler => {
  if (!_globalErrorHandler) {
    _globalErrorHandler = new GlobalErrorHandler();
  }
  return _globalErrorHandler;
};

// For backward compatibility
export const globalErrorHandler = {
  initialize: () => getGlobalErrorHandler().initialize(),
  cleanup: () => getGlobalErrorHandler().cleanup(),
};
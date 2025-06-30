import { IErrorService, ErrorSeverity, ErrorCategory, ErrorContext } from '../interfaces/IErrorService';
import { toast } from 'sonner';

/**
 * Production error service implementation
 * Handles user notifications, error logging, and recovery
 */
export class ErrorService implements IErrorService {
  private retryDelays = [1000, 2000, 4000]; // Exponential backoff
  
  logError(
    error: Error | unknown, 
    context?: string, 
    category: ErrorCategory = 'unknown',
    severity: ErrorSeverity = 'medium',
    metadata?: Record<string, any>
  ): void {
    const errorMessage = this.getErrorMessage(error);
    const logData = {
      error: error instanceof Error ? error.stack : String(error),
      context,
      category,
      severity,
      metadata,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
    };

    // Log to console with severity-based styling
    const logMethod = severity === 'critical' ? console.error : 
                     severity === 'high' ? console.error :
                     severity === 'medium' ? console.warn : console.log;
    
    logMethod(`[${severity.toUpperCase()}] [${category}] ${context ? `${context}: ` : ''}${errorMessage}`, logData);

    // Auto-report critical and high severity errors
    if (severity === 'critical' || severity === 'high') {
      this.reportError(error, logData).catch(() => {
        console.warn('Failed to report error to remote service');
      });
    }
  }

  showErrorToUser(message: string, description?: string): void {
    toast.error(message, {
      description,
      duration: 5000,
    });
  }

  showSuccessToUser(message: string, description?: string): void {
    toast.success(message, {
      description,
      duration: 3000,
    });
  }

  showWarningToUser(message: string, description?: string): void {
    toast.warning(message, {
      description,
      duration: 4000,
    });
  }

  handleCriticalError(error: Error | unknown, context: string, recoveryAction?: () => void): void {
    const errorMessage = this.getErrorMessage(error);
    
    // Log the critical error
    this.logError(error, `CRITICAL: ${context}`, 'runtime', 'critical');
    
    // Show user-friendly message with recovery option
    if (recoveryAction) {
      toast.error('Critical Error', {
        description: 'An unexpected error occurred. Would you like to try recovering?',
        duration: 10000,
        action: {
          label: 'Recover',
          onClick: recoveryAction,
        },
      });
    } else {
      this.showErrorToUser(
        'Critical Error',
        'An unexpected error occurred. Please refresh the page and try again.'
      );
    }
  }

  async handleNetworkError(error: Error | unknown, context: string, retryFn?: () => Promise<any>): Promise<void> {
    this.logError(error, context, 'network', 'medium');
    
    if (retryFn && this.shouldRetry(error)) {
      for (let attempt = 0; attempt < this.retryDelays.length; attempt++) {
        try {
          await new Promise(resolve => setTimeout(resolve, this.retryDelays[attempt]));
          await retryFn();
          this.showSuccessToUser('Connection restored', 'Successfully reconnected to the service.');
          return;
        } catch (retryError) {
          this.logError(retryError, `${context} - Retry ${attempt + 1}`, 'network', 'low');
        }
      }
      
      this.showErrorToUser(
        'Connection Failed',
        'Unable to connect to the service. Please check your connection and try again.'
      );
    } else {
      this.showErrorToUser(
        'Network Error',
        'A network error occurred. Please try again.'
      );
    }
  }

  handleValidationError(errors: Record<string, string>, context?: string): void {
    this.logError(
      new Error(`Validation errors: ${Object.keys(errors).join(', ')}`),
      context,
      'validation',
      'low',
      { validationErrors: errors }
    );

    const errorCount = Object.keys(errors).length;
    const message = errorCount === 1 ? 'Please correct the form error.' : `Please correct ${errorCount} form errors.`;
    
    this.showErrorToUser('Validation Error', message);
  }

  getErrorMessage(error: Error | unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    if (typeof error === 'string') {
      return error;
    }
    if (error && typeof error === 'object' && 'message' in error) {
      return String((error as any).message);
    }
    return 'An unknown error occurred';
  }

  async reportError(error: Error | unknown, context: ErrorContext): Promise<void> {
    try {
      // In a real application, you would send this to your error reporting service
      // For now, we'll just structure the data for future integration
      const errorReport = {
        message: this.getErrorMessage(error),
        stack: error instanceof Error ? error.stack : undefined,
        context,
        timestamp: new Date().toISOString(),
        release: import.meta.env.VITE_APP_VERSION || 'unknown',
        environment: import.meta.env.MODE,
      };

      // TODO: Integrate with error reporting service (e.g., Sentry)
      console.log('Error report prepared:', errorReport);
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (reportingError) {
      console.warn('Failed to report error:', reportingError);
    }
  }

  clearErrors(): void {
    // Dismiss all current toasts
    toast.dismiss();
  }

  shouldRetry(error: Error | unknown): boolean {
    const errorMessage = this.getErrorMessage(error).toLowerCase();
    
    // Retry on network-related errors
    const retryableErrors = [
      'network error',
      'fetch failed',
      'connection failed',
      'timeout',
      'disconnected',
      'offline',
    ];
    
    return retryableErrors.some(retryableError => errorMessage.includes(retryableError));
  }

  categorizeError(error: Error | unknown): ErrorCategory {
    const errorMessage = this.getErrorMessage(error).toLowerCase();
    
    if (errorMessage.includes('network') || errorMessage.includes('fetch') || errorMessage.includes('connection')) {
      return 'network';
    }
    if (errorMessage.includes('validation') || errorMessage.includes('invalid') || errorMessage.includes('required')) {
      return 'validation';
    }
    if (errorMessage.includes('database') || errorMessage.includes('storage') || errorMessage.includes('transaction')) {
      return 'database';
    }
    if (errorMessage.includes('unauthorized') || errorMessage.includes('authentication') || errorMessage.includes('permission')) {
      return 'authentication';
    }
    if (errorMessage.includes('component') || errorMessage.includes('render') || errorMessage.includes('hook')) {
      return 'runtime';
    }
    
    return 'unknown';
  }
}
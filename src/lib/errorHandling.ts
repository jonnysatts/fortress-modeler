/**
 * Error handling utilities for the application
 */

// Custom error class for application errors
export class AppError extends Error {
  code: string;
  details?: Record<string, any>;

  constructor(message: string, code: string, details?: Record<string, any>) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.details = details;
  }
}

// Error codes
export enum ErrorCode {
  // Database errors
  DB_CONNECTION_ERROR = 'DB_CONNECTION_ERROR',
  DB_QUERY_ERROR = 'DB_QUERY_ERROR',
  DB_TRANSACTION_ERROR = 'DB_TRANSACTION_ERROR',
  
  // Data errors
  INVALID_DATA = 'INVALID_DATA',
  MISSING_DATA = 'MISSING_DATA',
  DATA_NOT_FOUND = 'DATA_NOT_FOUND',
  
  // Export errors
  EXPORT_ERROR = 'EXPORT_ERROR',
  PDF_GENERATION_ERROR = 'PDF_GENERATION_ERROR',
  
  // Calculation errors
  CALCULATION_ERROR = 'CALCULATION_ERROR',
  
  // General errors
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR'
}

// Error handler function
export function handleError(error: unknown, defaultMessage = 'An unexpected error occurred'): { message: string; code: string } {
  console.error('Error caught by handleError:', error);
  
  // If it's our custom AppError, return its message and code
  if (error instanceof AppError) {
    return {
      message: error.message,
      code: error.code
    };
  }
  
  // If it's a standard Error, return its message with a default code
  if (error instanceof Error) {
    return {
      message: error.message,
      code: ErrorCode.UNKNOWN_ERROR
    };
  }
  
  // For any other type of error, return the default message
  return {
    message: defaultMessage,
    code: ErrorCode.UNKNOWN_ERROR
  };
}

// Function to create a user-friendly error message
export function getUserFriendlyErrorMessage(error: unknown): string {
  const { message, code } = handleError(error);
  
  // Map error codes to user-friendly messages
  switch (code) {
    case ErrorCode.DB_CONNECTION_ERROR:
      return 'Unable to connect to the database. Please try again later.';
    
    case ErrorCode.DB_QUERY_ERROR:
    case ErrorCode.DB_TRANSACTION_ERROR:
      return 'There was a problem with the database operation. Please try again.';
    
    case ErrorCode.INVALID_DATA:
    case ErrorCode.MISSING_DATA:
      return 'The data provided is invalid or incomplete. Please check your inputs.';
    
    case ErrorCode.DATA_NOT_FOUND:
      return 'The requested data could not be found.';
    
    case ErrorCode.EXPORT_ERROR:
      return 'There was a problem exporting your data. Please try again.';
    
    case ErrorCode.PDF_GENERATION_ERROR:
      return 'There was a problem generating the PDF. Please try again.';
    
    case ErrorCode.CALCULATION_ERROR:
      return 'There was a problem with the calculations. Please check your inputs.';
    
    case ErrorCode.NETWORK_ERROR:
      return 'Network error. Please check your connection and try again.';
    
    case ErrorCode.TIMEOUT_ERROR:
      return 'The operation timed out. Please try again.';
    
    default:
      // If we don't have a specific message for this code, return the original message
      // or a generic message if the original is too technical
      return message.includes('Error:') ? 'An unexpected error occurred. Please try again.' : message;
  }
}

// Function to log errors to a monitoring service (placeholder for now)
export function logErrorToMonitoring(error: unknown, context?: Record<string, any>): void {
  const { message, code } = handleError(error);
  
  // In a real app, this would send the error to a monitoring service like Sentry
  console.error(`[ERROR MONITORING] ${code}: ${message}`, {
    error,
    context,
    timestamp: new Date().toISOString()
  });
}

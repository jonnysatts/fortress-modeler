import { useState } from 'react';
import { toast } from '@/hooks/use-toast';

/**
 * Custom hook for handling errors in async operations.
 * Provides utilities for error state management and async operation wrapping.
 */
export function useErrorHandler() {
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Handle an error by setting the error state and displaying a toast notification.
   * @param error - The error to handle
   */
  const handleError = (error: unknown) => {
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'An unknown error occurred';
    
    setError(error instanceof Error ? error : new Error(errorMessage));
    toast({
      title: 'Error',
      description: errorMessage,
      variant: 'destructive',
    });
    console.error(error);
  };

  /**
   * Wrap an async operation with error handling and loading state management.
   * @param promise - The promise to wrap
   * @returns The result of the promise, or null if an error occurred
   */
  const wrapAsync = async <T>(promise: Promise<T>): Promise<T | null> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await promise;
      return result;
    } catch (err) {
      handleError(err);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Reset the error state.
   */
  const resetError = () => {
    setError(null);
  };

  return { 
    error, 
    isLoading, 
    handleError, 
    wrapAsync,
    resetError
  };
}

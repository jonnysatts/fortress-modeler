import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

interface AsyncErrorBoundaryProps {
  error: Error | null;
  resetError: () => void;
  children: React.ReactNode;
}

export function AsyncErrorBoundary({ error, resetError, children }: AsyncErrorBoundaryProps) {
  const navigate = useNavigate();

  useEffect(() => {
    if (error) {
      console.error('Async operation error:', error);
    }
  }, [error]);

  if (error) {
    return (
      <Alert variant="destructive" className="max-w-2xl mx-auto mt-8">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error Loading Data</AlertTitle>
        <AlertDescription className="space-y-2">
          <p>{error.message || 'An unexpected error occurred while loading data.'}</p>
          <div className="flex gap-2 mt-4">
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => {
                resetError();
                window.location.reload();
              }}
            >
              Refresh Page
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => {
                resetError();
                navigate('/');
              }}
            >
              Go to Dashboard
            </Button>
            <Button 
              size="sm"
              onClick={resetError}
            >
              Try Again
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  return <>{children}</>;
}

export function useAsyncError() {
  const [error, setError] = React.useState<Error | null>(null);

  const resetError = React.useCallback(() => {
    setError(null);
  }, []);

  const throwError = React.useCallback((error: Error) => {
    setError(error);
  }, []);

  return { error, resetError, throwError };
}
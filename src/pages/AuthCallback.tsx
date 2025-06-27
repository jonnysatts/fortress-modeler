import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { devLog } from '../lib/devLog';

export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { handleCallback } = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Prevent multiple executions
    let isMounted = true;
    let hasProcessed = false;

    const processCallback = async () => {
      // Prevent duplicate processing
      if (hasProcessed || !isMounted) {
        return;
      }
      hasProcessed = true;

      const code = searchParams.get('code');
      const error = searchParams.get('error');

      if (error) {
        setStatus('error');
        setError(`Authentication error: ${error}`);
        return;
      }

      if (!code) {
        setStatus('error');
        setError('No authorization code received');
        return;
      }

      try {
        devLog('Processing OAuth callback with code:', code);
        await handleCallback(code);
        setStatus('success');
        
        // Redirect to dashboard immediately and clear any URL state
        if (isMounted) {
          // Clear the URL completely and redirect to dashboard
          window.history.replaceState({}, '', '/dashboard');
          navigate('/dashboard', { replace: true });
        }
      } catch (err) {
        console.error('Callback processing error:', err);
        setStatus('error');
        setError(err instanceof Error ? err.message : 'Authentication failed');
      }
    };

    processCallback();

    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, []); // Empty dependency array to run only once

  const handleRetry = () => {
    navigate('/login', { replace: true });
  };

  const handleContinue = () => {
    navigate('/dashboard', { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">
            {status === 'loading' && 'Authenticating...'}
            {status === 'success' && 'Welcome!'}
            {status === 'error' && 'Authentication Failed'}
          </CardTitle>
          <CardDescription>
            {status === 'loading' && 'Please wait while we complete your sign-in...'}
            {status === 'success' && 'You have been successfully signed in. Redirecting to dashboard...'}
            {status === 'error' && 'There was a problem signing you in.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          {status === 'loading' && (
            <div className="flex justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          )}
          
          {status === 'success' && (
            <div className="space-y-4">
              <div className="flex justify-center">
                <CheckCircle className="h-12 w-12 text-green-600" />
              </div>
              <Button onClick={handleContinue} className="w-full">
                Continue to Dashboard
              </Button>
            </div>
          )}
          
          {status === 'error' && (
            <div className="space-y-4">
              <div className="flex justify-center">
                <AlertCircle className="h-12 w-12 text-red-600" />
              </div>
              {error && (
                <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
                  {error}
                </div>
              )}
              <Button onClick={handleRetry} className="w-full">
                Try Again
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
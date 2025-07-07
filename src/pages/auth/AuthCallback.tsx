import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Processing authentication...');

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Get the current URL hash which contains the auth tokens
        const hash = window.location.hash;
        console.log('Auth callback - URL hash:', hash);
        console.log('Auth callback - Full URL:', window.location.href);
        
        if (hash) {
          // Supabase will automatically handle the callback
          const { data, error } = await supabase.auth.getSession();
          
          if (error) {
            throw error;
          }
          
          if (data.session) {
            setStatus('success');
            setMessage('Authentication successful! Redirecting...');
            
            // Wait a moment to show success, then redirect
            setTimeout(() => {
              navigate('/migration');
            }, 2000);
          } else {
            throw new Error('No session found');
          }
        } else {
          throw new Error('No authentication data found');
        }
      } catch (error) {
        console.error('Auth callback error:', error);
        setStatus('error');
        setMessage(error instanceof Error ? error.message : 'Authentication failed');
        
        // Redirect to migration page after error
        setTimeout(() => {
          navigate('/migration');
        }, 3000);
      }
    };

    handleAuthCallback();
  }, [navigate]);

  const renderContent = () => {
    switch (status) {
      case 'loading':
        return (
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
            <span>Processing authentication...</span>
          </div>
        );
      case 'success':
        return (
          <div className="flex items-center gap-3 text-green-600">
            <CheckCircle className="h-5 w-5" />
            <span>Authentication successful!</span>
          </div>
        );
      case 'error':
        return (
          <div className="flex items-center gap-3 text-red-600">
            <AlertCircle className="h-5 w-5" />
            <span>Authentication failed</span>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Authentication</CardTitle>
          <CardDescription>
            Completing your sign-in process
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center">
            {renderContent()}
            <p className="text-sm text-gray-600 mt-4">
              {message}
            </p>
            {status === 'success' && (
              <p className="text-xs text-gray-500 mt-2">
                Redirecting to migration page...
              </p>
            )}
            {status === 'error' && (
              <p className="text-xs text-gray-500 mt-2">
                Redirecting back to migration page...
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
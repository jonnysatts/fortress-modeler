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
    console.log('AuthCallback component mounted');
    console.log('Current location:', window.location);
    
    const handleAuthCallback = async () => {
      try {
        // Add a small delay to ensure the page is fully loaded
        await new Promise(resolve => setTimeout(resolve, 500));
        
        console.log('Starting auth callback handling...');
        
        // Get the current URL hash which contains the auth tokens
        const hash = window.location.hash;
        const searchParams = new URLSearchParams(window.location.search);
        
        console.log('Auth callback - URL hash:', hash);
        console.log('Auth callback - Search params:', window.location.search);
        console.log('Auth callback - Full URL:', window.location.href);
        
        // Check for error in URL params first
        const error = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');
        
        if (error) {
          throw new Error(`Auth error: ${error} - ${errorDescription}`);
        }
        
        if (hash || searchParams.has('code')) {
          console.log('Found auth data, getting session...');
          
          // Give Supabase a moment to process the callback tokens
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Check if we have auth tokens in the URL hash
          if (hash) {
            console.log('Processing hash params:', hash);
            const hashParams = new URLSearchParams(hash.substring(1));
            const accessToken = hashParams.get('access_token');
            const refreshToken = hashParams.get('refresh_token');
            
            console.log('Hash tokens:', {
              hasAccessToken: !!accessToken,
              hasRefreshToken: !!refreshToken,
              tokenType: hashParams.get('token_type'),
              expiresIn: hashParams.get('expires_in')
            });
            
            if (accessToken) {
              // Manually set the session if we have tokens
              const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken || ''
              });
              
              console.log('Manual session set result:', { sessionData, sessionError });
              
              if (sessionError) {
                throw sessionError;
              }
              
              if (sessionData.session) {
                console.log('Manual session established, redirecting...');
                setStatus('success');
                setMessage('Authentication successful! Redirecting...');
                
                setTimeout(() => {
                  navigate('/migration');
                }, 2000);
                return;
              }
            }
          }
          
          // Fallback: try to get session normally
          const { data, error } = await supabase.auth.getSession();
          
          console.log('Session data:', data);
          console.log('Session error:', error);
          
          if (error) {
            throw error;
          }
          
          if (data.session) {
            console.log('Session found, redirecting...');
            setStatus('success');
            setMessage('Authentication successful! Redirecting...');
            
            setTimeout(() => {
              navigate('/migration');
            }, 2000);
          } else {
            throw new Error('No session found after callback');
          }
        } else {
          // Enhanced debugging for no auth data case
          console.log('No auth data found - detailed debug:', {
            fullUrl: window.location.href,
            hash: window.location.hash,
            search: window.location.search,
            pathname: window.location.pathname,
            hashLength: window.location.hash.length,
            searchLength: window.location.search.length,
            hasCode: searchParams.has('code'),
            hasAccessToken: window.location.hash.includes('access_token'),
            hasError: searchParams.has('error')
          });
          
          throw new Error('No authentication data found in URL');
        }
      } catch (error) {
        console.error('Auth callback error:', error);
        setStatus('error');
        setMessage(error instanceof Error ? error.message : 'Authentication failed');
        
        // Redirect to migration page after error
        setTimeout(() => {
          navigate('/migration');
        }, 5000);
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
          <CardTitle>Authentication Callback</CardTitle>
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
            <div className="mt-6 p-4 bg-gray-100 rounded text-xs">
              <p><strong>Debug info:</strong></p>
              <p>URL: {window.location.href}</p>
              <p>Status: {status}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';

/**
 * OAuth callback page for handling Google authentication redirects
 * This page processes the OAuth callback and redirects users appropriately
 */
export function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated, isLoading } = useSupabaseAuth();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Check for error parameters
        const error = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');
        
        if (error) {
          setStatus('error');
          setErrorMessage(errorDescription || 'Authentication failed');
          console.error('OAuth error:', { error, errorDescription });
          return;
        }

        // Supabase automatically handles the callback via onAuthStateChange
        // We just need to wait for the authentication state to update
        console.log('Processing OAuth callback...');
        
        // Check if we have tokens in the URL
        const accessToken = searchParams.get('access_token');
        const refreshToken = searchParams.get('refresh_token');
        
        if (accessToken) {
          // Tokens are present in URL, Supabase should handle them
          console.log('OAuth tokens detected in URL');
        }
        
        setStatus('success');
      } catch (error) {
        console.error('Error handling auth callback:', error);
        setStatus('error');
        setErrorMessage('An unexpected error occurred during authentication');
      }
    };

    handleAuthCallback();
  }, [searchParams]);

  useEffect(() => {
    // Redirect once authentication is complete
    if (isAuthenticated && status === 'success') {
      console.log('Authentication successful, redirecting...');
      
      // Get the intended destination from localStorage or default to home
      const intendedPath = localStorage.getItem('auth_redirect_path') || '/';
      localStorage.removeItem('auth_redirect_path');
      
      // Small delay to ensure state is fully updated
      setTimeout(() => {
        navigate(intendedPath, { replace: true });
      }, 100);
    }
  }, [isAuthenticated, status, navigate]);

  useEffect(() => {
    // Handle error cases with redirect
    if (status === 'error') {
      // Redirect to login page with error after a delay
      setTimeout(() => {
        navigate('/login?error=' + encodeURIComponent(errorMessage), { replace: true });
      }, 3000);
    }
  }, [status, errorMessage, navigate]);

  if (status === 'processing' || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Completing Sign In...
          </h2>
          <p className="text-gray-600">
            Please wait while we finish setting up your account.
          </p>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
          <div className="rounded-full h-12 w-12 bg-green-100 mx-auto mb-4 flex items-center justify-center">
            <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Sign In Successful!
          </h2>
          <p className="text-gray-600">
            Welcome to Fortress Modeler. Redirecting you now...
          </p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
          <div className="rounded-full h-12 w-12 bg-red-100 mx-auto mb-4 flex items-center justify-center">
            <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Authentication Failed
          </h2>
          <p className="text-gray-600 mb-4">
            {errorMessage || 'Unable to complete sign in. Please try again.'}
          </p>
          <button
            onClick={() => navigate('/login', { replace: true })}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return null;
}
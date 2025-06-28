import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { config } from '../lib/config';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Loader2, LogIn, Cloud, Database } from 'lucide-react';

export default function Login() {
  const { login, isAuthenticated, isLoading } = useAuth();
  const [loginLoading, setLoginLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if user has chosen offline mode
  const isOfflineMode = localStorage.getItem('fortress_offline_mode') === 'true';

  // If user is already authenticated, redirect to dashboard
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  // If not using cloud sync, redirect to dashboard (local mode)  
  if (!config.useCloudSync) {
    return <Navigate to="/dashboard" replace />;
  }

  // If user is in offline mode, redirect to dashboard unless they came here intentionally
  // (we'll detect intentional visits by checking if they have the offline flag but are not authenticated)
  if (isOfflineMode && !window.location.search.includes('force')) {
    return <Navigate to="/dashboard" replace />;
  }

  // Special case: if user manually navigated to login while in offline mode
  // Don't auto-redirect, let them choose to enable cloud mode
  const handleEnableCloudMode = () => {
    localStorage.removeItem('fortress_offline_mode');
    // Stay on login page to allow cloud authentication
    window.location.reload();
  };

  const handleLogin = async () => {
    try {
      setLoginLoading(true);
      setError(null);
      await login();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
      setLoginLoading(false);
    }
  };

  const handleLocalMode = () => {
    // Set offline mode flag in localStorage
    localStorage.setItem('fortress_offline_mode', 'true');
    
    // Navigate to dashboard without authentication (local mode)
    window.location.href = '/dashboard';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold text-gray-900">
            Fortress Modeler
          </CardTitle>
          <CardDescription>
            Sign in to access your financial models and projects
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Cloud Authentication */}
          <div className="space-y-4">
            <Button
              onClick={handleLogin}
              disabled={loginLoading}
              className="w-full flex items-center justify-center space-x-2"
              size="lg"
            >
              {loginLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <LogIn className="h-4 w-4" />
              )}
              <span>Continue with Google</span>
            </Button>

            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <Cloud className="h-4 w-4" />
              <span>Cloud sync enabled - your data will be saved online</span>
            </div>
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-gray-500">Or</span>
            </div>
          </div>

          {/* Local Mode */}
          <div className="space-y-4">
            <Button
              onClick={handleLocalMode}
              variant="outline"
              className="w-full flex items-center justify-center space-x-2"
              size="lg"
            >
              <Database className="h-4 w-4" />
              <span>Continue Offline</span>
            </Button>

            <div className="text-center text-sm text-gray-500">
              <p>Use local storage only</p>
              <p className="text-xs">Your data will be saved locally on this device</p>
            </div>
          </div>

          {/* Features */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Features:</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Financial modeling and projections</li>
              <li>• Revenue and cost analysis</li>
              <li>• Export to PDF and Excel</li>
              <li>• Real-time calculations</li>
              {config.useCloudSync && (
                <>
                  <li>• Cloud synchronization</li>
                  <li>• Multi-device access</li>
                </>
              )}
            </ul>
          </div>

          {/* Show cloud mode option if user is in offline mode */}
          {isOfflineMode && (
            <div className="mt-6 pt-4 border-t border-gray-200">
              <div className="text-center space-y-3">
                <p className="text-sm text-gray-600">
                  You're currently in offline mode
                </p>
                <Button
                  onClick={handleEnableCloudMode}
                  variant="outline"
                  size="sm"
                  className="w-full"
                >
                  <Cloud className="h-4 w-4 mr-2" />
                  Switch to Cloud Mode
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
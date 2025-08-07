import { useState, useEffect } from 'react';
import { signInWithGoogle, getCurrentUser, signOut } from '../lib/supabase';
import { User } from '@supabase/supabase-js';

export function AuthComponent() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const { user } = await getCurrentUser();
      setUser(user);
    } catch (error) {
      console.error('Error checking user:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async () => {
    setLoading(true);
    const { error } = await signInWithGoogle();
    if (error) {
      console.error('Sign in error:', error);
      alert(`Sign in failed: ${error.message}`);
    }
    // Google OAuth will redirect, so no need to update state here
  };

  const handleSignOut = async () => {
    setLoading(true);
    await signOut();
    setUser(null);
    setLoading(false);
    window.location.reload();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (user) {
    return (
      <div className="flex items-center gap-4 p-4 bg-green-50 rounded-lg">
        <div className="flex-1">
          <div className="text-sm text-gray-600">Signed in as</div>
          <div className="font-semibold">{user.email}</div>
        </div>
        <button
          onClick={handleSignOut}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition"
        >
          Sign Out
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center p-8 bg-blue-50 rounded-lg">
      <h2 className="text-2xl font-bold mb-4">Welcome to Fortress Modeler</h2>
      <p className="text-gray-600 mb-6">Sign in to access your financial models</p>
      <button
        onClick={handleSignIn}
        className="flex items-center gap-3 px-6 py-3 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition shadow-sm"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        Sign in with Google
      </button>
    </div>
  );
}

import { ReactNode } from 'react';
import { useSupabaseAuth } from '../hooks/useSupabaseAuth';
import { Navigate } from 'react-router-dom';

interface ProtectedRouteProps {
  children: ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useSupabaseAuth();
  
  // TEMPORARY: Bypass authentication check but still provide auth context
  // TODO: Re-enable authentication once OAuth is working
  console.log('🚧 [TEMP] Authentication check bypassed for testing');
  
  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }
  
  // Bypass the user check for now
  // if (!user) {
  //   return <Navigate to="/login" replace />;
  // }
  
  return <>{children}</>;
}
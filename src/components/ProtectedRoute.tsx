import { ReactNode } from 'react';
import { useSupabaseAuth } from '../hooks/useSupabaseAuth';
import { Navigate } from 'react-router-dom';

interface ProtectedRouteProps {
  children: ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, isLoading } = useSupabaseAuth();
  
  // 🚨 EMERGENCY AUTH BYPASS - Remove when auth is fixed
  const EMERGENCY_BYPASS = false;
  
  console.log('🔍 [ProtectedRoute] Auth state:', {
    hasUser: !!user,
    userId: user?.id,
    userEmail: user?.email,
    isLoading,
    willRedirect: !user && !isLoading,
    emergencyBypass: EMERGENCY_BYPASS
  });
  
  if (EMERGENCY_BYPASS) {
    console.log('🚨 [ProtectedRoute] EMERGENCY AUTH BYPASS ACTIVE');
    return <>{children}</>;
  }
  
  if (isLoading) {
    console.log('🔍 [ProtectedRoute] Still loading, showing spinner...');
    return <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>;
  }
  
  if (!user) {
    console.log('🔍 [ProtectedRoute] No user found, redirecting to login...');
    return <Navigate to="/login" replace />;
  }
  
  console.log('🔍 [ProtectedRoute] User authenticated, rendering protected content...');
  return <>{children}</>;
}
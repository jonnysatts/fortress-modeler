// EMERGENCY AUTH GUARD - Add to App.tsx immediately
import { useEffect } from 'react';
import { useAuth } from './hooks/useAuth';
import { Navigate } from 'react-router-dom';

// Wrap your entire app with this component
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  
  // CRITICAL: Block all access if not authenticated
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl">Verifying authentication...</div>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    // Redirect to login - NO ACCESS WITHOUT AUTH
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
}

// Add to your main App component:
// <AuthGuard>
//   <Routes>
//     ... your existing routes ...
//   </Routes>
// </AuthGuard>

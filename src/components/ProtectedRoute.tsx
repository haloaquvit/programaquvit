import { useAuthContext } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import PageLoader from './PageLoader';
import React from 'react'; // Import React for React.ReactNode

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading, session } = useAuthContext();

  // Log untuk debugging
  console.log('[ProtectedRoute] user:', user);
  console.log('[ProtectedRoute] session:', session);
  console.log('[ProtectedRoute] isLoading:', isLoading);

  if (isLoading) {
    console.log('[ProtectedRoute] Waiting for auth...');
    return <PageLoader />;
  }

  if (!user && !session) {
    console.warn('[ProtectedRoute] No user or session, redirecting to login...');
    return <Navigate to="/login" replace />; // Added replace to prevent back button issues
  }

  console.log('[ProtectedRoute] User:', user ? user.email : 'N/A', 'Session:', session ? 'Active' : 'Inactive');
  return <>{children}</>;
}
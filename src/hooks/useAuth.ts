import { useAuthContext } from '@/contexts/AuthContext';

export const useAuth = () => {
  const { session, user, isLoading, signOut } = useAuthContext();
  // Alias user ke session untuk kompatibilitas dengan ProtectedRoute
  return { session: session, user, isLoading, signOut };
};
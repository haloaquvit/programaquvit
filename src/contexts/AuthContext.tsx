import { createContext, useState, useEffect, useContext, ReactNode, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Employee } from '@/types/employee';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';

interface AuthContextType {
  session: Session | null;
  user: Employee | null;
  isLoading: boolean;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<Employee | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUserProfile = useCallback(async (supabaseUser: SupabaseUser): Promise<Employee | null> => {
    const { data, error } = await supabase
      .from('employees_view')
      .select('*')
      .eq('id', supabaseUser.id)
      .single();
    
    if (error) {
      console.error("Error fetching user profile:", error.message);
      // Jika profil tidak ditemukan, logout paksa untuk menghindari state yang tidak valid
      await supabase.auth.signOut();
      return null;
    }
    
    if (data) {
      return {
        id: data.id,
        name: data.full_name,
        username: data.username,
        email: data.email,
        role: data.role,
        phone: data.phone,
        address: data.address,
        status: data.status,
      };
    }
    return null;
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function initializeAuth() {
      // 1. Ambil sesi saat ini secara eksplisit
      const { data: { session } } = await supabase.auth.getSession();
      
      if (isMounted) {
        setSession(session);
        if (session?.user) {
          const profile = await fetchUserProfile(session.user);
          setUser(profile);
        }
        // 2. Selesaikan loading setelah semua data awal didapatkan
        setIsLoading(false);
      }
    }

    initializeAuth();

    // 3. Siapkan listener untuk perubahan di masa depan (login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;

        setSession(session);
        if (event === 'SIGNED_OUT') {
          setUser(null);
        } else if (session?.user) {
          const profile = await fetchUserProfile(session.user);
          setUser(profile);
        }
      }
    );

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, [fetchUserProfile]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const value = {
    session,
    user,
    isLoading,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};
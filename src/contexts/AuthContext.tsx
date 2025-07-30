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
      // If profile not found in employees_view (e.g., new user or view not updated yet)
      // Try to fetch from 'profiles' table directly or create a fallback profile
      if (error.code === 'PGRST116' || error.message.includes('0 rows')) { // PGRST116 is "No rows found"
        console.warn('User profile not found in employees_view. Attempting to fetch/create in profiles table.');
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', supabaseUser.id)
          .single();

        if (profileError && profileError.code === 'PGRST116') {
          // Profile still not found, create a basic one
          console.log('Profile not found in profiles table, creating a new one.');
          const { data: newProfile, error: insertError } = await supabase
            .from('profiles')
            .insert({
              id: supabaseUser.id,
              email: supabaseUser.email,
              full_name: supabaseUser.user_metadata?.full_name || 'Nama Pengguna',
              username: supabaseUser.user_metadata?.username || null,
              role: supabaseUser.user_metadata?.role || 'karyawan',
              status: 'Aktif'
            })
            .select()
            .single();

          if (insertError) {
            console.error("Failed to create fallback user profile:", insertError.message);
            return null;
          } else if (newProfile) {
            console.log('Fallback profile created:', newProfile);
            return {
              id: newProfile.id,
              name: newProfile.full_name,
              username: newProfile.username,
              email: newProfile.email,
              role: newProfile.role,
              phone: newProfile.phone,
              address: newProfile.address,
              status: newProfile.status,
            };
          }
        } else if (profileData) {
          // Profile found in profiles table, use it
          console.log('Profile found in profiles table:', profileData);
          return {
            id: profileData.id,
            name: profileData.full_name,
            username: profileData.username,
            email: profileData.email,
            role: profileData.role,
            phone: profileData.phone,
            address: profileData.address,
            status: profileData.status,
          };
        }
      }
      console.error("Error fetching user profile:", error.message);
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
        } else {
          setUser(null); // Ensure user is null if no session
        }
        // 2. Selesaikan loading setelah semua data awal didapatkan
        setIsLoading(false);
      }
    }

    initializeAuth();

    // 3. Siapkan listener untuk perubahan di masa depan (login/logout)
    const { data: { subscription } = {} } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;

        setSession(session);
        if (event === 'SIGNED_OUT') {
          setUser(null);
        } else if (session?.user) {
          const profile = await fetchUserProfile(session.user);
          setUser(profile);
        }
        // Ensure isLoading is false after any auth state change
        setIsLoading(false); 
      }
    );

    return () => {
      isMounted = false;
      if (subscription) {
        subscription.unsubscribe();
      }
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
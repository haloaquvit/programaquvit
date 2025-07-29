import { createContext, useState, useEffect, useContext, ReactNode } from 'react';
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

  useEffect(() => {
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      if (session?.user) {
        await fetchUserProfile(session.user);
      }
      setIsLoading(false);
    };

    getInitialSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      if (session?.user) {
        setIsLoading(true);
        await fetchUserProfile(session.user);
        setIsLoading(false);
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (supabaseUser: SupabaseUser) => {
    // Mengambil data dari employees_view untuk memastikan peran Owner konsisten
    const { data, error } = await supabase
      .from('employees_view')
      .select('*')
      .eq('id', supabaseUser.id)
      .single();
    
    if (error) {
      // Jika profil tidak ditemukan (error code PGRST116), coba buat profil baru.
      // Ini untuk menangani kasus pengguna lama yang belum memiliki profil.
      if (error.code === 'PGRST116') {
        console.warn('User profile not found. Attempting to create one.');
        const { data: newProfile, error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: supabaseUser.id,
            email: supabaseUser.email,
            full_name: supabaseUser.user_metadata?.full_name || 'Nama Belum Diatur',
            role: supabaseUser.user_metadata?.role || 'karyawan',
            status: 'Aktif'
          })
          .select()
          .single();

        if (insertError) {
          console.error("Failed to create fallback user profile:", insertError);
          setUser(null);
          // Langsung logout jika pembuatan profil gagal agar tidak terjadi loop
          await supabase.auth.signOut();
        } else if (newProfile) {
          const employeeProfile: Employee = {
            id: newProfile.id,
            name: newProfile.full_name,
            email: newProfile.email,
            role: newProfile.role,
            phone: newProfile.phone,
            address: newProfile.address,
            status: newProfile.status,
          };
          setUser(employeeProfile);
        }
      } else {
        console.error("Error fetching user profile from view:", error);
        setUser(null);
      }
    } else if (data) {
      const employeeProfile: Employee = {
        id: data.id,
        name: data.full_name,
        email: data.email,
        role: data.role,
        phone: data.phone,
        address: data.address,
        status: data.status,
      };
      setUser(employeeProfile);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
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
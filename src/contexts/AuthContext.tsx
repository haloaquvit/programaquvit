import { createContext, useState, useEffect, useContext, ReactNode, useRef, useCallback } from 'react';
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
  const idleTimer = useRef<NodeJS.Timeout | null>(null);

  const signOut = useCallback(async () => {
    if (idleTimer.current) {
      clearTimeout(idleTimer.current);
    }
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  }, []);

  const resetIdleTimer = useCallback(() => {
    if (idleTimer.current) {
      clearTimeout(idleTimer.current);
    }
    idleTimer.current = setTimeout(() => {
      console.log("Sesi berakhir karena tidak ada aktivitas. Pengguna akan dikeluarkan.");
      signOut();
    }, 8 * 60 * 60 * 1000); // 8 jam dalam milidetik
  }, [signOut]);

  useEffect(() => {
    const activityEvents: (keyof WindowEventMap)[] = ['mousemove', 'keydown', 'click', 'scroll'];

    if (session) {
      resetIdleTimer();
      activityEvents.forEach(event => {
        window.addEventListener(event, resetIdleTimer);
      });
    }

    return () => {
      if (idleTimer.current) {
        clearTimeout(idleTimer.current);
      }
      activityEvents.forEach(event => {
        window.removeEventListener(event, resetIdleTimer);
      });
    };
  }, [session, resetIdleTimer]);

  const fetchUserProfile = useCallback(async (supabaseUser: SupabaseUser) => {
    const { data, error } = await supabase
      .from('employees_view')
      .select('*')
      .eq('id', supabaseUser.id)
      .single();
    
    if (error) {
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
  }, []);

  useEffect(() => {
    const initializeSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error("Error getting session on mount:", error);
          setSession(null);
          setUser(null);
          return;
        }
        
        setSession(session);
        if (session?.user) {
          await fetchUserProfile(session.user);
        } else {
          setUser(null);
        }
      } catch (e) {
        console.error("Unexpected error during session initialization:", e);
      } finally {
        setIsLoading(false);
      }
    };

    initializeSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      if (session?.user) {
        await fetchUserProfile(session.user);
      } else {
        setUser(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchUserProfile]);

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
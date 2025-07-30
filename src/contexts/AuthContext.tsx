import {
  createContext,
  useState,
  useEffect,
  useContext,
  ReactNode,
} from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Employee } from '@/types/employee';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';

interface AuthContextType {
  session: Session | null;
  user: Employee | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<Employee | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch user profile dari Supabase
  const fetchUserProfile = async (supabaseUser: SupabaseUser) => {
    try {
      const { data, error } = await supabase
        .from('employees_view')
        .select('*')
        .eq('id', supabaseUser.id)
        .single();

      if (error) throw error;

      const employeeProfile: Employee = {
        id: data.id,
        name: data.full_name,
        username: data.username,
        email: data.email,
        role: data.role,
        phone: data.phone,
        address: data.address,
        status: data.status,
      };

      setUser(employeeProfile);
    } catch (err) {
      console.error('[Auth] Failed to fetch user profile:', err);
      setUser(null);
    }
  };

  // Sign out
  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
  };

  // Initial session check on mount
  useEffect(() => {
    const initializeAuth = async () => {
      setIsLoading(true);
      const { data, error } = await supabase.auth.getSession();
      const currentSession = data?.session ?? null;
      setSession(currentSession);

      if (currentSession?.user) {
        await fetchUserProfile(currentSession.user);
      }

      setIsLoading(false);
    };

    initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);

      if (newSession?.user) {
        await fetchUserProfile(newSession.user);
      } else {
        setUser(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Log untuk debugging
  useEffect(() => {
    console.log('[AuthContext] session:', session);
    console.log('[AuthContext] user:', user);
    console.log('[AuthContext] isLoading:', isLoading);
  }, [session, user, isLoading]);

  return (
    <AuthContext.Provider
      value={{ session, user, isLoading, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};
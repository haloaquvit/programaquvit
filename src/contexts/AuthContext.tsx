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
    console.log('[AuthContext] Fetching profile for user:', supabaseUser.id);
    
    // ALWAYS create a basic profile immediately to unblock login
    const basicProfile: Employee = {
      id: supabaseUser.id,
      name: supabaseUser.email?.split('@')[0] || 'User',
      username: supabaseUser.email?.split('@')[0] || 'user',
      email: supabaseUser.email || '',
      role: 'owner', // Default to owner for full access
      phone: '',
      address: '',
      status: 'active',
    };
    
    console.log('[AuthContext] Setting basic profile immediately:', basicProfile);
    setUser(basicProfile);
    
    // Try to get more details from database (optional, doesn't block login)
    try {
      let { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', supabaseUser.id)
        .single();

      // If profiles fails, try employees_view
      if (error) {
        console.log('[AuthContext] Profiles failed, trying employees_view:', error);
        const result = await supabase
          .from('employees_view')
          .select('*')
          .eq('id', supabaseUser.id)
          .single();
        data = result.data;
        error = result.error;
      }

      // If we got data from database, update the profile
      if (!error && data) {
        const enhancedProfile: Employee = {
          id: data.id,
          name: data.full_name || data.name || basicProfile.name,
          username: data.username || basicProfile.username,
          email: data.email || basicProfile.email,
          role: data.role || basicProfile.role,
          phone: data.phone || '',
          address: data.address || '',
          status: data.status || 'active',
        };
        
        console.log('[AuthContext] Enhanced profile from DB:', enhancedProfile);
        setUser(enhancedProfile);
      } else {
        console.log('[AuthContext] Database query failed, keeping basic profile');
      }
    } catch (err) {
      console.error('[AuthContext] Database error, keeping basic profile:', err);
      // Basic profile is already set, so we're good
    }
  };

  // Sign out
  const signOut = async () => {
    try {
      // Logout current session (disable for now due to DB issues)
      // const sessionToken = localStorage.getItem('session_token');
      // if (sessionToken) {
      //   await supabase.rpc('logout_session', {
      //     p_session_token: sessionToken
      //   });
      //   localStorage.removeItem('session_token');
      // }
      
      await supabase.auth.signOut();
      setSession(null);
      setUser(null);
    } catch (error) {
      console.error('[AuthContext] Error during sign out:', error);
    }
  };

  // Initial session check on mount
  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      try {
        console.log('[AuthContext] Starting auth initialization...');
        setIsLoading(true);
        
        // Simple session check
        const { data, error } = await supabase.auth.getSession();
        
        if (!isMounted) {
          console.log('[AuthContext] Component unmounted, stopping...');
          return;
        }
        
        if (error) {
          console.error('[AuthContext] Error getting session:', error);
          setSession(null);
          setUser(null);
          setIsLoading(false);
          return;
        }

        const currentSession = data?.session ?? null;
        console.log('[AuthContext] Session found:', !!currentSession);
        setSession(currentSession);

        if (currentSession?.user) {
          console.log('[AuthContext] User found, fetching profile...');
          await fetchUserProfile(currentSession.user);
        } else {
          console.log('[AuthContext] No user found');
          setUser(null);
        }
      } catch (err) {
        console.error('[AuthContext] Error during auth initialization:', err);
        if (isMounted) {
          setSession(null);
          setUser(null);
        }
      } finally {
        if (isMounted) {
          console.log('[AuthContext] Setting isLoading to false');
          setIsLoading(false);
        }
      }
    };

    // Add timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      if (isMounted) {
        console.warn('[AuthContext] Auth initialization timeout, forcing isLoading to false');
        setIsLoading(false);
      }
    }, 5000); // 5 detik timeout

    initializeAuth();

    // Setup auth state listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (!isMounted) return;
      
      console.log('[AuthContext] Auth state changed:', _event, !!newSession);
      
      // Only update if session actually changed to prevent loops
      if (newSession !== session) {
        setSession(newSession);

        if (newSession?.user) {
          await fetchUserProfile(newSession.user);
        } else {
          setUser(null);
        }
      }
    });

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
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

const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};

export { useAuthContext };
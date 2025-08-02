import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';

export const useSessionManager = () => {
  const { session, signOut } = useAuthContext();

  // Generate unique session token
  const generateSessionToken = useCallback(() => {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Get device info
  const getDeviceInfo = useCallback(() => {
    return {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine
    };
  }, []);

  // Register new session and logout other devices
  const registerSession = useCallback(async () => {
    if (!session?.user?.id) return;

    try {
      const sessionToken = generateSessionToken();
      const deviceInfo = getDeviceInfo();

      // Store session token in localStorage for current device
      localStorage.setItem('session_token', sessionToken);

      // Call Supabase function to register session
      const { error } = await supabase.rpc('register_user_session', {
        p_session_token: sessionToken,
        p_device_info: JSON.stringify(deviceInfo),
        p_user_agent: deviceInfo.userAgent
      });

      if (error) {
        console.error('Error registering session:', error);
      }
    } catch (error) {
      console.error('Error in registerSession:', error);
    }
  }, [session?.user?.id, generateSessionToken, getDeviceInfo]);

  // Check if current session is still active
  const checkSessionStatus = useCallback(async () => {
    if (!session?.user?.id) return true;

    const sessionToken = localStorage.getItem('session_token');
    if (!sessionToken) return false;

    try {
      const { data, error } = await supabase
        .from('user_sessions')
        .select('is_active')
        .eq('session_token', sessionToken)
        .eq('user_id', session.user.id)
        .single();

      if (error || !data?.is_active) {
        console.log('Session is no longer active, logging out...');
        await signOut();
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error checking session status:', error);
      return false;
    }
  }, [session?.user?.id, signOut]);

  // Logout current session
  const logoutSession = useCallback(async () => {
    const sessionToken = localStorage.getItem('session_token');
    if (!sessionToken) return;

    try {
      await supabase.rpc('logout_session', {
        p_session_token: sessionToken
      });

      localStorage.removeItem('session_token');
    } catch (error) {
      console.error('Error logging out session:', error);
    }
  }, []);

  // Register session on login
  useEffect(() => {
    if (session?.user?.id) {
      registerSession();
    }
  }, [session?.user?.id, registerSession]);

  // Check session status periodically
  useEffect(() => {
    if (!session?.user?.id) return;

    const interval = setInterval(() => {
      checkSessionStatus();
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [session?.user?.id, checkSessionStatus]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      logoutSession();
    };
  }, [logoutSession]);

  return {
    registerSession,
    checkSessionStatus,
    logoutSession
  };
};
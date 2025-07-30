import { supabase } from '@/integrations/supabase/client';

export const handleLogin = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error('Login gagal:', error.message);
    return { success: false, message: error.message };
  }

  console.log('Login berhasil:', data);
  return { success: true, user: data.user };
};
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Package } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';

export default function LoginPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        // Redirect user to the homepage after they sign in
        navigate('/');
      }
    });

    // Cleanup subscription on component unmount
    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <Package className="mx-auto h-12 w-12 text-primary" />
          <CardTitle className="text-2xl font-bold mt-4">Kasir Percetakan</CardTitle>
          <CardDescription>Silakan masuk untuk melanjutkan</CardDescription>
        </CardHeader>
        <CardContent>
          <Auth
            supabaseClient={supabase}
            appearance={{ theme: ThemeSupa }}
            providers={[]}
            localization={{
              variables: {
                sign_in: {
                  email_label: 'Alamat Email',
                  password_label: 'Password',
                  button_label: 'Masuk',
                  link_text: 'Sudah punya akun? Masuk',
                },
                sign_up: {
                  email_label: 'Alamat Email',
                  password_label: 'Password',
                  button_label: 'Daftar',
                  link_text: 'Belum punya akun? Daftar',
                },
                forgotten_password: {
                  email_label: 'Alamat Email',
                  button_label: 'Kirim instruksi reset',
                  link_text: 'Lupa password?',
                },
              },
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
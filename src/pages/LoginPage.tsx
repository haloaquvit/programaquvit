import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Package } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { useCompanySettings } from '@/hooks/useCompanySettings';
import { Skeleton } from '@/components/ui/skeleton';

export default function LoginPage() {
  const navigate = useNavigate();
  const { settings, isLoading } = useCompanySettings();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        navigate('/');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          {isLoading ? (
            <Skeleton className="mx-auto h-16 w-32" />
          ) : settings?.logo ? (
            <img src={settings.logo} alt="Company Logo" className="mx-auto h-16 object-contain" />
          ) : (
            <Package className="mx-auto h-12 w-12 text-primary" />
          )}
          <CardTitle className="text-2xl font-bold mt-4">{settings?.name || 'Matahari Digital Printing'}</CardTitle>
          <CardDescription>Silakan masuk untuk melanjutkan</CardDescription>
        </CardHeader>
        <CardContent>
          <Auth
            supabaseClient={supabase}
            appearance={{ theme: ThemeSupa }}
            providers={[]}
            showLinks={false}
            localization={{
              variables: {
                sign_in: {
                  email_label: 'Alamat Email',
                  password_label: 'Password',
                  button_label: 'Masuk',
                },
              },
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
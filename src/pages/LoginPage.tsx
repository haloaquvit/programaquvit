import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Package } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { useCompanySettings } from '@/hooks/useCompanySettings';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import PageLoader from '@/components/PageLoader';

export default function LoginPage() {
  const navigate = useNavigate();
  const { settings, isLoading: settingsLoading } = useCompanySettings();
  const { session, isLoading: authLoading } = useAuth();

  useEffect(() => {
    if (session && !authLoading) {
      navigate('/', { replace: true });
    }
  }, [session, authLoading, navigate]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        navigate('/', { replace: true });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  if (authLoading || session) {
    return <PageLoader />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          {settingsLoading ? (
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
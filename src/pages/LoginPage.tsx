import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Package } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useCompanySettings } from '@/hooks/useCompanySettings';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import PageLoader from '@/components/PageLoader';

const loginSchema = z.object({
  email: z.string().email({ message: 'Format email tidak valid.' }).min(1, { message: 'Email harus diisi.' }),
  password: z.string().min(1, { message: 'Password harus diisi.' }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const navigate = useNavigate();
  const { settings, isLoading: settingsLoading } = useCompanySettings();
  const { session, isLoading: authLoading } = useAuth();
  const [loginError, setLoginError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (session && !authLoading) {
      navigate('/', { replace: true });
    }
  }, [session, authLoading, navigate]);

  const onSubmit = async (formData: LoginFormValues) => {
    setLoginError(null);
    setIsLoading(true);
    
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (error) {
        if (error.message === 'Invalid login credentials') {
          setLoginError('Kombinasi email dan password salah.');
        } else {
          setLoginError(error.message);
        }
      } else {
        navigate('/', { replace: true });
      }
    } catch (error) {
      console.error('Login error:', error);
      setLoginError('Terjadi kesalahan saat login. Silakan coba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading only if auth is still loading and we have a session
  if (authLoading && session) {
    return <PageLoader />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          {settingsLoading ? (
            <Skeleton className="mx-auto h-16 w-32" />
          ) : settings?.logo ? (
            <img 
              src={settings.logo} 
              alt="Company Logo" 
              className="mx-auto h-16 object-contain"
              onError={(e) => {
                console.error('Failed to load logo:', settings.logo);
                e.currentTarget.style.display = 'none';
              }}
            />
          ) : (
            <Package className="mx-auto h-12 w-12 text-primary" />
          )}
          <CardTitle className="text-2xl font-bold mt-4">{settings?.name || 'Matahari Digital Printing'}</CardTitle>
          <CardDescription>Silakan masuk dengan email untuk melanjutkan</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {loginError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Login Gagal</AlertTitle>
                <AlertDescription>{loginError}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="contoh: user@email.com"
                {...register('email')}
                autoComplete="email"
              />
              {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                {...register('password')}
                autoComplete="current-password"
              />
              {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting || isLoading}>
              {isSubmitting || isLoading ? 'Memproses...' : 'Masuk'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
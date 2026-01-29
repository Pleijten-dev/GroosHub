'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Input } from '@/shared/components/UI/Input/Input';
import { Button } from '@/shared/components/UI/Button/Button';
import { Card } from '@/shared/components/UI/Card/Card';

interface LoginFormProps {
  translations: {
    title: string;
    email: string;
    password: string;
    signIn: string;
    invalidCredentials: string;
    error: string;
  };
  locale: string;
}

export function LoginForm({ translations, locale }: LoginFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || `/${locale}`;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    console.log('🔐 Login attempt:', { email, callbackUrl });

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
        callbackUrl,
      });

      console.log('📊 SignIn result:', result);

      if (result?.error) {
        console.error('❌ Login error:', result.error);
        setError(translations.invalidCredentials);
        setLoading(false);
      } else if (result?.ok) {
        console.log('✅ Login successful, redirecting to:', callbackUrl);
        // Keep loading state during navigation - don't set loading to false
        router.push(callbackUrl);
        router.refresh();
      } else {
        console.error('❌ Unexpected result:', result);
        setError(translations.error);
        setLoading(false);
      }
    } catch (err) {
      console.error('❌ Login exception:', err);
      setError(translations.error);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background-secondary px-4">
      <Card className="w-full max-w-md" padding="xl" shadow="lg">
        <div className="space-y-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-text-primary">
              {translations.title}
            </h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="email"
              label={translations.email}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              disabled={loading}
            />

            <Input
              type="password"
              label={translations.password}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              disabled={loading}
            />

            {error && (
              <div className="p-3 rounded-md bg-error-light text-error text-sm">
                {error}
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              size="base"
              fullWidth
              loading={loading}
            >
              {translations.signIn}
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}

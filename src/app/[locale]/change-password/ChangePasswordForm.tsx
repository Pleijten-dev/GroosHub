'use client';

import { useState } from 'react';
import { signOut } from 'next-auth/react';
import { Input } from '@/shared/components/UI/Input/Input';
import { Button } from '@/shared/components/UI/Button/Button';
import { Card } from '@/shared/components/UI/Card/Card';

interface ChangePasswordFormProps {
  translations: {
    title: string;
    description: string;
    passwordHint: string;
    newPassword: string;
    confirmPassword: string;
    submit: string;
    success: string;
    passwordMismatch: string;
    passwordTooShort: string;
    passwordRequirements: string;
    error: string;
  };
  locale: string;
}

export function ChangePasswordForm({ translations, locale }: ChangePasswordFormProps) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    // Validate password length
    if (newPassword.length < 8) {
      setError(translations.passwordTooShort);
      return;
    }

    // Validate password complexity (uppercase, lowercase, number)
    const hasUppercase = /[A-Z]/.test(newPassword);
    const hasLowercase = /[a-z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);

    if (!hasUppercase || !hasLowercase || !hasNumber) {
      setError(translations.passwordRequirements);
      return;
    }

    // Validate passwords match
    if (newPassword !== confirmPassword) {
      setError(translations.passwordMismatch);
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        // Sign out and redirect to login so user can log in with new password
        // This refreshes the session with the correct must_change_password value
        setTimeout(async () => {
          await signOut({ callbackUrl: `/${locale}/login` });
        }, 2000);
      } else {
        setError(data.error || translations.error);
      }
    } catch (err) {
      console.error('Change password error:', err);
      setError(translations.error);
    } finally {
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
            <p className="mt-2 text-text-muted">
              {translations.description}
            </p>
            <p className="mt-1 text-sm text-text-muted">
              {translations.passwordHint}
            </p>
          </div>

          {success ? (
            <div className="p-4 rounded-md bg-green-100 text-green-800 text-center">
              {translations.success}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                type="password"
                label={translations.newPassword}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                autoComplete="new-password"
                disabled={loading}
                minLength={8}
              />

              <Input
                type="password"
                label={translations.confirmPassword}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
                disabled={loading}
                minLength={8}
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
                {translations.submit}
              </Button>
            </form>
          )}
        </div>
      </Card>
    </div>
  );
}

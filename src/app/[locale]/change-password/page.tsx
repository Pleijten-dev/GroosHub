import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getTranslations } from '@/lib/i18n/config';
import { auth } from '@/lib/auth';
import { ChangePasswordForm } from './ChangePasswordForm';

interface ChangePasswordPageProps {
  params: Promise<{
    locale: string;
  }>;
}

export default async function ChangePasswordPage({ params }: ChangePasswordPageProps) {
  console.log('[change-password] Page loading...');
  const { locale } = await params;
  console.log('[change-password] Locale:', locale);

  const session = await auth();
  console.log('[change-password] Session:', session ? { user: session.user } : 'null');

  // If not logged in, redirect to login
  if (!session?.user) {
    console.log('[change-password] No session, redirecting to login');
    redirect(`/${locale}/login`);
  }

  // If user doesn't need to change password, redirect to home
  if (!session.user.must_change_password) {
    console.log('[change-password] must_change_password is false, redirecting to home');
    redirect(`/${locale}`);
  }

  console.log('[change-password] User must change password, rendering form');
  const t = await getTranslations(locale as 'nl' | 'en');

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ChangePasswordForm translations={t.changePassword} locale={locale} />
    </Suspense>
  );
}

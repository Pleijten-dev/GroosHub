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
  const { locale } = await params;
  const session = await auth();

  // If not logged in, redirect to login
  if (!session?.user) {
    redirect(`/${locale}/login`);
  }

  // If user doesn't need to change password, redirect to home
  if (!session.user.must_change_password) {
    redirect(`/${locale}`);
  }

  const t = await getTranslations(locale as 'nl' | 'en');

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ChangePasswordForm translations={t.changePassword} locale={locale} />
    </Suspense>
  );
}

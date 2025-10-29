import { Suspense } from 'react';
import { getTranslations } from '@/lib/i18n/config';
import { LoginForm } from './LoginForm';

interface LoginPageProps {
  params: Promise<{
    locale: string;
  }>;
}

export default async function LoginPage({ params }: LoginPageProps) {
  const { locale } = await params;
  const t = await getTranslations(locale as 'nl' | 'en');

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginForm translations={t.login} locale={locale} />
    </Suspense>
  );
}

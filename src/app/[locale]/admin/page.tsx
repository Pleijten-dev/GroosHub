import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { getTranslations } from '@/lib/i18n/config';
import { AdminPanel } from './AdminPanel';

interface AdminPageProps {
  params: Promise<{
    locale: string;
  }>;
}

export default async function AdminPage({ params }: AdminPageProps) {
  const session = await auth();
  const { locale } = await params;

  // Redirect to login if not authenticated
  if (!session?.user) {
    redirect(`/${locale}/login?callbackUrl=/${locale}/admin`);
  }

  // Redirect to home if not admin
  if (session.user.role !== 'admin') {
    redirect(`/${locale}`);
  }

  const t = await getTranslations(locale as 'nl' | 'en');

  return <AdminPanel translations={t.admin} common={t.common} />;
}

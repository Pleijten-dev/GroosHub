import { Suspense } from 'react';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { NewProjectPageClient } from './NewProjectPageClient';

type PageProps = {
  params: Promise<{ locale: string }>;
};

export default async function NewProjectPage({ params }: PageProps) {
  const session = await auth();
  const { locale } = await params;

  if (!session?.user) {
    redirect(`/${locale}/login`);
  }

  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    }>
      <NewProjectPageClient
        locale={locale}
        userEmail={session.user.email || undefined}
        userName={session.user.name || undefined}
      />
    </Suspense>
  );
}

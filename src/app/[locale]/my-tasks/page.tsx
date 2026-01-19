import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import MyTasksClient from './MyTasksClient';

export default async function MyTasksPage({
  params
}: {
  params: Promise<{ locale: string }>
}) {
  const session = await auth();
  const { locale } = await params;

  if (!session?.user) {
    redirect(`/${locale}/login`);
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-6">
        <MyTasksClient locale={locale} />
      </div>
    </div>
  );
}

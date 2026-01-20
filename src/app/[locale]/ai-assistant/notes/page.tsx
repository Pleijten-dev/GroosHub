/**
 * Notes Page
 * Placeholder for standalone notes functionality
 *
 * TODO: Future enhancements:
 * - Create notes table in database
 * - Create API endpoints for CRUD operations
 * - Implement note creation modal
 * - Add rich text editor support
 * - Link notes to projects/tasks
 */

import { Suspense } from 'react';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { NotesPageClient } from './NotesPageClient';

export interface NotesPageProps {
  params: Promise<{
    locale: string;
  }>;
}

export default async function NotesPage({ params }: NotesPageProps) {
  const session = await auth();
  const { locale } = await params;

  if (!session?.user) {
    redirect(`/${locale}/login`);
  }

  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      }
    >
      <NotesPageClient locale={locale} />
    </Suspense>
  );
}

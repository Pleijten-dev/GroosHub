/**
 * Kanban Backend Test Page
 * Admin page to test all task management API endpoints
 * Access at: /nl/admin/kanban-backend-test or /en/admin/kanban-backend-test
 */

import { Suspense } from 'react';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { KanbanBackendTestClient } from './KanbanBackendTestClient';

type PageProps = {
  params: Promise<{ locale: string }>;
};

export default async function KanbanBackendTestPage({ params }: PageProps) {
  const session = await auth();
  const { locale } = await params;

  if (!session?.user) {
    redirect(`/${locale}/login`);
  }

  // Only allow admins to access this page
  if (session.user.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
          <p className="text-gray-600">Only administrators can access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    }>
      <KanbanBackendTestClient
        locale={locale}
        userId={session.user.id}
        userName={session.user.name || 'Unknown'}
      />
    </Suspense>
  );
}

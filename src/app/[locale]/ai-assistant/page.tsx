/**
 * AI Assistant Page
 * Multi-project AI chat with sidebar navigation
 * Phase 4: Project-based chat interface
 */

import { Suspense } from 'react';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { AIAssistantClient } from './AIAssistantClient';

export interface AIAssistantPageProps {
  params: Promise<{
    locale: string;
  }>;
  searchParams: Promise<{
    chat?: string;
    project_id?: string;
  }>;
}

export default async function AIAssistantPage({ params, searchParams }: AIAssistantPageProps) {
  const session = await auth();
  const { locale } = await params;
  const { chat, project_id } = await searchParams;

  if (!session?.user) {
    redirect(`/${locale}/login`);
  }

  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    }>
      <AIAssistantClient
        locale={locale}
        userEmail={session.user.email || undefined}
        userName={session.user.name || undefined}
        chatId={chat}
        projectId={project_id}
      />
    </Suspense>
  );
}

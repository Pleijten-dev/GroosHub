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
    view?: 'overview' | 'chats' | 'tasks' | 'files' | 'notes' | 'members' | 'trash';
    message?: string; // Initial message to send automatically
    fileIds?: string; // Comma-separated file IDs to include with initial message
  }>;
}

export default async function AIAssistantPage({ params, searchParams }: AIAssistantPageProps) {
  const session = await auth();
  const { locale } = await params;
  const { chat, project_id, view, message, fileIds } = await searchParams;

  if (!session?.user) {
    redirect(`/${locale}/login`);
  }

  // Parse comma-separated fileIds into array
  const initialFileIds = fileIds ? fileIds.split(',').filter(id => id.trim()) : undefined;

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
        activeView={view || 'overview'}
        initialMessage={message}
        initialFileIds={initialFileIds}
      />
    </Suspense>
  );
}

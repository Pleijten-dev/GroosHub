/**
 * New Chat Page
 * Start a new conversation
 * Week 2: Multi-Chat UI
 */

import { ChatUI } from '@/features/chat/components/ChatUI';

export interface NewChatPageProps {
  params: Promise<{
    locale: string;
  }>;
}

export default async function NewChatPage({ params }: NewChatPageProps) {
  // Next.js 15: params must be awaited
  const { locale } = await params;

  return <ChatUI locale={locale as 'nl' | 'en'} />;
}

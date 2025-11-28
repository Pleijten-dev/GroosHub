/**
 * Individual Chat Page
 * Continue an existing conversation
 * Week 2: Multi-Chat UI
 */

import { ChatUI } from '@/features/chat/components/ChatUI';

export interface ChatPageProps {
  params: Promise<{
    locale: string;
    id: string;
  }>;
}

export default async function ChatPage({ params }: ChatPageProps) {
  // Next.js 15: params must be awaited
  const { locale, id: chatId } = await params;

  return <ChatUI locale={locale as 'nl' | 'en'} chatId={chatId} />;
}

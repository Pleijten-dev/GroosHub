/**
 * AI Assistant Page
 * Shows list of user's chat conversations
 * Week 2: Multi-Chat UI
 */

import { ChatList } from '@/features/chat/components/ChatList';

export interface AIAssistantPageProps {
  params: Promise<{
    locale: string;
  }>;
}

export default async function AIAssistantPage({ params }: AIAssistantPageProps) {
  // Next.js 15: params must be awaited
  const { locale } = await params;

  return <ChatList locale={locale as 'nl' | 'en'} />;
}

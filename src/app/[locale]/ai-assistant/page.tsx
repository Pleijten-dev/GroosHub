/**
 * AI Assistant Page
 * Server component wrapper for the chat UI
 */

import { ChatUI } from '@/features/chat/components/ChatUI';

export interface AIAssistantPageProps {
  params: Promise<{
    locale: string;
  }>;
}

export default async function AIAssistantPage({ params }: AIAssistantPageProps) {
  // Next.js 15: params must be awaited
  const { locale } = await params;

  return <ChatUI locale={locale as 'nl' | 'en'} />;
}

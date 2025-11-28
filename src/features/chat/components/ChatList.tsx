/**
 * ChatList Component
 * Displays a list of user's chat conversations
 * Week 2: Multi-Chat UI
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/shared/components/UI/Card/Card';
import { Button } from '@/shared/components/UI/Button/Button';

interface Chat {
  id: string;
  title: string;
  model_id: string | null;
  created_at: string;
  updated_at: string;
}

interface ChatListProps {
  locale: 'nl' | 'en';
}

export function ChatList({ locale }: ChatListProps) {
  const router = useRouter();
  const [chats, setChats] = useState<Chat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const t = {
    nl: {
      title: 'Mijn Gesprekken',
      newChat: 'Nieuw Gesprek',
      loading: 'Laden...',
      error: 'Fout bij laden van gesprekken',
      noChats: 'Nog geen gesprekken. Start een nieuw gesprek!',
      delete: 'Verwijderen',
      open: 'Openen',
    },
    en: {
      title: 'My Conversations',
      newChat: 'New Chat',
      loading: 'Loading...',
      error: 'Error loading chats',
      noChats: 'No chats yet. Start a new conversation!',
      delete: 'Delete',
      open: 'Open',
    }
  };

  const text = t[locale];

  useEffect(() => {
    loadChats();
  }, []);

  async function loadChats() {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/chats');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load chats');
      }

      setChats(data.chats || []);
    } catch (err) {
      console.error('[ChatList] Error loading chats:', err);
      setError(text.error);
    } finally {
      setIsLoading(false);
    }
  }

  async function deleteChat(chatId: string) {
    if (!confirm(locale === 'nl' ? 'Weet je zeker dat je dit gesprek wilt verwijderen?' : 'Are you sure you want to delete this chat?')) {
      return;
    }

    try {
      const response = await fetch(`/api/chats/${chatId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete chat');
      }

      // Remove from list
      setChats(chats.filter(c => c.id !== chatId));
    } catch (err) {
      console.error('[ChatList] Error deleting chat:', err);
      alert(locale === 'nl' ? 'Fout bij verwijderen' : 'Error deleting chat');
    }
  }

  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return locale === 'nl' ? 'Nu' : 'Now';
    if (diffMins < 60) return `${diffMins}${locale === 'nl' ? 'm' : 'm'}`;
    if (diffHours < 24) return `${diffHours}${locale === 'nl' ? 'u' : 'h'}`;
    if (diffDays < 7) return `${diffDays}${locale === 'nl' ? 'd' : 'd'}`;

    return date.toLocaleDateString(locale);
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">{text.loading}</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-error">{error}</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-base py-lg max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-lg">
        <h1 className="text-3xl font-bold">{text.title}</h1>
        <Button
          onClick={() => router.push(`/${locale}/ai-assistant/new`)}
          variant="primary"
          size="base"
        >
          {text.newChat}
        </Button>
      </div>

      {/* Chat List */}
      {chats.length === 0 ? (
        <Card className="p-xl text-center">
          <p className="text-lg text-gray-500 mb-base">{text.noChats}</p>
          <Button
            onClick={() => router.push(`/${locale}/ai-assistant/new`)}
            variant="primary"
          >
            {text.newChat}
          </Button>
        </Card>
      ) : (
        <div className="space-y-sm">
          {chats.map((chat) => (
            <Card
              key={chat.id}
              className="p-base hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => router.push(`/${locale}/ai-assistant/chats/${chat.id}`)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-xs">{chat.title}</h3>
                  <div className="flex items-center gap-base text-sm text-gray-500">
                    {chat.model_id && (
                      <span className="px-sm py-xs bg-gray-100 rounded-base">
                        {chat.model_id}
                      </span>
                    )}
                    <span>{formatDate(chat.updated_at)}</span>
                  </div>
                </div>

                <div className="flex gap-sm">
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/${locale}/ai-assistant/chats/${chat.id}`);
                    }}
                    variant="secondary"
                    size="sm"
                  >
                    {text.open}
                  </Button>
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteChat(chat.id);
                    }}
                    variant="secondary"
                    size="sm"
                  >
                    {text.delete}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

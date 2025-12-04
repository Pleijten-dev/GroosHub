'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/shared/components/UI/Button/Button';
import { cn } from '@/shared/utils/cn';

interface ProjectChatsProps {
  projectId: string;
  locale: string;
}

interface Chat {
  id: string;
  title: string;
  model_id: string;
  message_count: number;
  created_at: string;
  updated_at: string;
  last_message_at: string;
  user_name: string;
}

export function ProjectChats({ projectId, locale }: ProjectChatsProps) {
  const router = useRouter();
  const [chats, setChats] = useState<Chat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const translations = {
    nl: {
      chats: 'Chats',
      newChat: 'Nieuwe Chat',
      noChats: 'Nog geen chats in dit project',
      messages: 'berichten',
      createdBy: 'Aangemaakt door',
      lastActive: 'Laatst actief',
      open: 'Openen',
      delete: 'Verwijderen',
      confirmDelete: 'Weet je zeker dat je deze chat wilt verwijderen?',
      loading: 'Laden...',
      errorLoading: 'Fout bij laden chats',
      untitled: 'Naamloze chat'
    },
    en: {
      chats: 'Chats',
      newChat: 'New Chat',
      noChats: 'No chats in this project yet',
      messages: 'messages',
      createdBy: 'Created by',
      lastActive: 'Last active',
      open: 'Open',
      delete: 'Delete',
      confirmDelete: 'Are you sure you want to delete this chat?',
      loading: 'Loading...',
      errorLoading: 'Error loading chats',
      untitled: 'Untitled chat'
    }
  };

  const t = translations[locale as keyof typeof translations] || translations.en;

  useEffect(() => {
    fetchChats();
  }, [projectId]);

  async function fetchChats() {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/chat/conversations?project_id=${projectId}`);
      if (res.ok) {
        const data = await res.json();
        setChats(data.conversations || []);
      } else {
        setError(t.errorLoading);
      }
    } catch (error) {
      console.error('Failed to fetch chats:', error);
      setError(t.errorLoading);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDeleteChat(chatId: string) {
    if (!confirm(t.confirmDelete)) return;

    try {
      const res = await fetch(`/api/chats/${chatId}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        await fetchChats();
      }
    } catch (error) {
      console.error('Failed to delete chat:', error);
    }
  }

  function handleOpenChat(chatId: string) {
    router.push(`/${locale}/ai-assistant?chat=${chatId}`);
  }

  function formatRelativeTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return locale === 'nl' ? 'Zojuist' : 'Just now';
    if (diffInSeconds < 3600) {
      const mins = Math.floor(diffInSeconds / 60);
      return locale === 'nl' ? `${mins} min geleden` : `${mins} min ago`;
    }
    if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return locale === 'nl' ? `${hours} uur geleden` : `${hours} hours ago`;
    }
    if (diffInSeconds < 604800) {
      const days = Math.floor(diffInSeconds / 86400);
      return locale === 'nl' ? `${days} dagen geleden` : `${days} days ago`;
    }

    return date.toLocaleDateString(locale);
  }

  if (isLoading) {
    return (
      <div className="text-center py-lg">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="text-gray-600 mt-sm">{t.loading}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-lg">
        <p className="text-red-600">{error}</p>
        <Button variant="secondary" size="sm" onClick={fetchChats} className="mt-base">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-base">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">{t.chats}</h2>
        <Button
          variant="primary"
          size="sm"
          onClick={() => router.push(`/${locale}/ai-assistant?project_id=${projectId}`)}
        >
          {t.newChat}
        </Button>
      </div>

      {/* Chats List */}
      {chats.length === 0 ? (
        <div className="text-center py-lg border-2 border-dashed border-gray-300 rounded-lg">
          <svg
            className="w-16 h-16 text-gray-400 mx-auto mb-base"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
          <p className="text-gray-600 mb-base">{t.noChats}</p>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => router.push(`/${locale}/ai-assistant?project_id=${projectId}`)}
          >
            {t.newChat}
          </Button>
        </div>
      ) : (
        <div className="space-y-sm">
          {chats.map(chat => (
            <div
              key={chat.id}
              className="flex items-center justify-between p-base bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
              onClick={() => handleOpenChat(chat.id)}
            >
              <div className="flex items-center gap-base flex-1 min-w-0">
                {/* Chat Icon */}
                <div className="w-10 h-10 bg-primary/10 text-primary flex items-center justify-center rounded flex-shrink-0">
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                  </svg>
                </div>

                {/* Chat Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">
                    {chat.title || t.untitled}
                  </p>
                  <div className="text-xs text-gray-600 mt-xs flex items-center gap-md flex-wrap">
                    <span>{chat.message_count} {t.messages}</span>
                    <span>•</span>
                    <span>{t.createdBy} {chat.user_name}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-xs">
                    {t.lastActive} {formatRelativeTime(chat.last_message_at)}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-sm" onClick={(e) => e.stopPropagation()}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenChat(chat.id);
                  }}
                >
                  {t.open}
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteChat(chat.id);
                  }}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ProjectChats;

// src/features/chat/components/ChatSidebar/useChatSidebarSections.tsx
'use client';

import React from 'react';
import { SidebarSection } from '../../../../shared/components/UI/Sidebar/types';
import { Button } from '../../../../shared/components/UI';
import { cn } from '../../../../shared/utils/cn';

interface Chat {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

interface ChatSidebarSectionsProps {
  locale: string;
  currentChatId?: string;
  onNewChat: () => void;
  onSelectChat: (chatId: string) => void;
  chats?: Chat[];
  isLoading?: boolean;
}

export const useChatSidebarSections = ({
  locale,
  currentChatId,
  onNewChat,
  onSelectChat,
  chats = [],
  isLoading = false,
}: ChatSidebarSectionsProps): SidebarSection[] => {

  // New chat section content
  const newChatSection = (
    <div className="space-y-md">
      <Button
        onClick={onNewChat}
        variant="primary"
        className="w-full justify-center"
        disabled={isLoading}
      >
        <svg className="w-5 h-5 mr-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 5v14M5 12h14"/>
        </svg>
        {locale === 'nl' ? 'Nieuwe Chat' : 'New Chat'}
      </Button>
    </div>
  );

  // Chat history section content
  const chatHistorySection = (
    <div className="space-y-xs">
      {isLoading ? (
        <div className="text-center py-lg">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-sm text-text-muted mt-sm">
            {locale === 'nl' ? 'Laden...' : 'Loading...'}
          </p>
        </div>
      ) : chats.length === 0 ? (
        <div className="text-center py-lg">
          <svg className="w-12 h-12 mx-auto mb-sm opacity-30" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>
          </svg>
          <p className="text-sm text-text-muted px-sm">
            {locale === 'nl'
              ? 'Geen chatgeschiedenis. Start een nieuwe chat!'
              : 'No chat history. Start a new chat!'}
          </p>
        </div>
      ) : (
        <>
          {chats.map((chat) => (
            <button
              key={chat.id}
              onClick={() => onSelectChat(chat.id)}
              className={cn(
                'w-full text-left p-sm rounded-md transition-colors',
                'group relative',
                currentChatId === chat.id
                  ? 'bg-primary-light text-primary border border-primary'
                  : 'text-text-secondary hover:bg-gray-100 hover:text-text-primary border border-transparent'
              )}
            >
              <div className="flex items-start gap-sm">
                <svg className="w-4 h-4 mt-1 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>
                </svg>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {chat.title}
                  </p>
                  <p className="text-xs text-text-muted truncate mt-xs">
                    {formatDate(chat.updatedAt, locale)}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </>
      )}
    </div>
  );

  // Define sidebar sections
  const sections: SidebarSection[] = [
    {
      id: 'new-chat',
      title: locale === 'nl' ? 'Chat Starten' : 'Start Chat',
      description: locale === 'nl'
        ? 'Begin een nieuw gesprek met de AI assistent.'
        : 'Start a new conversation with the AI assistant.',
      content: newChatSection,
    },
    {
      id: 'history',
      title: locale === 'nl' ? 'Recente Chats' : 'Recent Chats',
      content: chatHistorySection,
    },
  ];

  return sections;
};

// Helper function to format date
function formatDate(dateString: string, locale: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInHours = diffInMs / (1000 * 60 * 60);
  const diffInDays = diffInMs / (1000 * 60 * 60 * 24);

  if (diffInHours < 24) {
    // Show time if today
    return date.toLocaleTimeString(locale === 'nl' ? 'nl-NL' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  } else if (diffInDays < 7) {
    // Show day of week if within last week
    return date.toLocaleDateString(locale === 'nl' ? 'nl-NL' : 'en-US', {
      weekday: 'short',
    });
  } else {
    // Show date if older
    return date.toLocaleDateString(locale === 'nl' ? 'nl-NL' : 'en-US', {
      month: 'short',
      day: 'numeric',
    });
  }
}

export default useChatSidebarSections;

// src/app/[locale]/ai-assistant/AIAssistantClient.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { ChatInterface } from '@/features/chat/components/chat';
import { Sidebar, useSidebar } from '@/shared/components/UI/Sidebar';
import { useChatSidebarSections } from '@/features/chat/components/ChatSidebar';

interface Chat {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

interface AIAssistantClientProps {
  locale: string;
  userId: string;
}

export function AIAssistantClient({ locale, userId }: AIAssistantClientProps) {
  const [currentChatId, setCurrentChatId] = useState<string | undefined>(undefined);
  const [chats, setChats] = useState<Chat[]>([]);
  const [isLoadingChats, setIsLoadingChats] = useState(false);

  // Use sidebar hook for state management
  const { isCollapsed, toggle } = useSidebar({
    defaultCollapsed: false,
    persistState: true,
    storageKey: 'chat-sidebar-collapsed',
    autoCollapseMobile: true,
  });

  // Load chat history on mount
  useEffect(() => {
    loadChatHistory();
  }, []);

  const loadChatHistory = async () => {
    setIsLoadingChats(true);
    try {
      const response = await fetch('/api/chat/history');
      if (response.ok) {
        const data = await response.json();
        setChats(data.chats || []);
      }
    } catch (error) {
      console.error('Failed to load chat history:', error);
    } finally {
      setIsLoadingChats(false);
    }
  };

  const handleNewChat = () => {
    setCurrentChatId(undefined);
    // Optionally reload the page or reset chat state
    window.location.href = `/${locale}/ai-assistant`;
  };

  const handleSelectChat = (chatId: string) => {
    setCurrentChatId(chatId);
    // Optionally navigate to the chat
    window.location.href = `/${locale}/ai-assistant?chat=${chatId}`;
  };

  // Get sidebar sections
  const sidebarSections = useChatSidebarSections({
    locale,
    currentChatId,
    onNewChat: handleNewChat,
    onSelectChat: handleSelectChat,
    chats,
    isLoading: isLoadingChats,
  });

  // Calculate main content margin based on sidebar state
  const mainContentMargin = isCollapsed ? 'ml-[60px]' : 'ml-[320px]';

  return (
    <div className="flex h-screen w-screen overflow-hidden relative bg-white">
      {/* SIDEBAR */}
      <Sidebar
        isCollapsed={isCollapsed}
        onToggle={toggle}
        sections={sidebarSections}
        title={locale === 'nl' ? 'AI Assistent' : 'AI Assistant'}
        subtitle={locale === 'nl' ? 'Chat met AI' : 'Chat with AI'}
        position="left"
        expandedWidth="320px"
        collapsedWidth="60px"
      />

      {/* MAIN CONTENT */}
      <main
        className={`
          flex-1 flex flex-col overflow-hidden bg-white transition-all duration-300
          ${mainContentMargin}
        `}
      >
        <ChatInterface locale={locale} chatId={currentChatId} />
      </main>
    </div>
  );
}

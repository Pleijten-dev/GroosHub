// src/app/[locale]/ai-assistant/AIAssistantClient.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
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

export function AIAssistantClient({ locale }: AIAssistantClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Get chat ID from URL query parameter
  const chatIdFromUrl = searchParams.get('chat');

  const [currentChatId, setCurrentChatId] = useState<string | undefined>(chatIdFromUrl || undefined);
  const [chats, setChats] = useState<Chat[]>([]);
  const [isLoadingChats, setIsLoadingChats] = useState(false);
  const [key, setKey] = useState(0); // Key to force re-render of ChatInterface

  // Use sidebar hook for state management
  const { isCollapsed, toggle } = useSidebar({
    defaultCollapsed: false,
    persistState: true,
    storageKey: 'chat-sidebar-collapsed',
    autoCollapseMobile: true,
  });

  // Update currentChatId when URL changes
  useEffect(() => {
    setCurrentChatId(chatIdFromUrl || undefined);
    setKey(prev => prev + 1); // Force ChatInterface to remount with new chatId
  }, [chatIdFromUrl]);

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
    // Navigate to clean URL without chat parameter
    router.push(`/${locale}/ai-assistant`);
  };

  const handleSelectChat = (chatId: string) => {
    // Navigate to URL with chat parameter
    router.push(`/${locale}/ai-assistant?chat=${chatId}`);
  };

  const handleChatCreated = (chatId: string) => {
    // When a new chat is created, reload chat history and navigate to it
    loadChatHistory();
    router.push(`/${locale}/ai-assistant?chat=${chatId}`);
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
        <ChatInterface
          key={key}
          locale={locale}
          chatId={currentChatId}
          onChatCreated={handleChatCreated}
        />
      </main>
    </div>
  );
}

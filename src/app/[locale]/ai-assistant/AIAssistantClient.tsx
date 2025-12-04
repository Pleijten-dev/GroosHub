'use client';

import React from 'react';
import { ProjectsSidebar } from '@/features/projects/components/ProjectsSidebar';
import { ChatUI } from '@/features/chat/components/ChatUI';
import { useProjectsSidebar } from '@/features/projects/hooks/useProjectsSidebar';

interface AIAssistantClientProps {
  locale: string;
  userEmail?: string;
  userName?: string;
  chatId?: string;
  projectId?: string;
}

export function AIAssistantClient({
  locale,
  userEmail,
  userName,
  chatId,
  projectId // Note: projectId support will be added to ChatUI in future enhancement
}: AIAssistantClientProps) {
  const { isCollapsed, toggleSidebar, isLoaded } = useProjectsSidebar();

  // Don't render until sidebar state is loaded from localStorage
  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <ProjectsSidebar
        isCollapsed={isCollapsed}
        onToggle={toggleSidebar}
        locale={locale}
        userEmail={userEmail}
        userName={userName}
      />

      {/* Main content area - adjust margin based on sidebar state */}
      <main
        className="flex-1 overflow-hidden transition-all duration-normal"
        style={{
          marginLeft: isCollapsed ? '60px' : '280px'
        }}
      >
        <ChatUI
          locale={locale as 'nl' | 'en'}
          chatId={chatId}
        />
      </main>
    </div>
  );
}

export default AIAssistantClient;
